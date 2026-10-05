/**
 * THE SERVER — API and the built app on ONE port.
 * ---------------------------------------------------------------------------
 * Why one port matters: the frontend runs in the student's browser, which is not
 * the machine the API runs on. If the app fetched `http://localhost:8787/api/…`
 * it would work on a dev laptop and break the moment it is proxied, previewed or
 * deployed. So the API is mounted at `/api` on the same origin as the app and
 * the client calls it with a *relative* URL. Same code, every environment.
 *
 *   node server/server.mjs [port]      # default 4173
 *
 * Serves, in order:
 *   1. /api/*            → the JSON API
 *   2. static assets     → dist/ (immutable caching for /assets/*)
 *   3. SPA fallback      → dist/index.html so /admin, /strategy, /join?ref= work
 *   …and if dist/ is missing, falls back to the single-file build so the demo
 *   still comes up in a fresh environment.
 */
import express from 'express';
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, resolve, join } from 'node:path';
import { createApi } from './api.mjs';
import { getDb, getMeta, setMeta, getStats } from './db.mjs';

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const DIST = resolve('dist');
const SINGLE = resolve('standalone-preview.html');
const useSingle = !existsSync(join(DIST, 'index.html')) && existsSync(SINGLE);
const ROOT = useSingle ? resolve('.') : DIST;
const SHELL = useSingle ? SINGLE : join(DIST, 'index.html');

const app = express();

// Behind the sandbox proxy / a load balancer, `req.ip` is the proxy unless we
// ask Express to trust the forwarded header — which rate limiting depends on.
app.set('trust proxy', true);
app.disable('x-powered-by');

// 64kb of JSON is ~200 queued events; anything larger is not a legitimate client.
app.use(express.json({ limit: '64kb' }));

/**
 * A malformed body must not answer with Express's default HTML error page.
 * A client that sends broken JSON gets a JSON error it can actually read —
 * otherwise a frontend bug surfaces as "Unexpected token < in JSON".
 */
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large', detail: 'Body exceeds 64kb.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'invalid_json', detail: 'Request body is not valid JSON.' });
  }
  return next(err);
});

/**
 * RATE LIMITING — deliberately generous, because the failure mode matters more
 * than the protection.
 *
 * Losing a real registration costs a student; letting someone script a few extra
 * rows costs nothing on a free prototype. So the limits are set well above any
 * plausible human burst (and above a demo with the whole room on one conference
 * wifi, which shares an IP through the proxy). This is here to stop a runaway
 * loop, not to police visitors.
 */
const WINDOW_MS = 60_000;
const LIMITS = { '/api/register': 30, '/api/events': 240, '/api/messages': 12, '/api/reminders': 12, '/api/admin/login': 10, default: 300 };
const hits = new Map();

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, times] of hits) {
    const live = times.filter((t) => t > cutoff);
    if (live.length) hits.set(key, live);
    else hits.delete(key);
  }
}, WINDOW_MS).unref();

app.use((req, res, next) => {
  const limit = LIMITS[req.path] ?? LIMITS.default;
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const times = (hits.get(key) ?? []).filter((t) => t > now - WINDOW_MS);
  times.push(now);
  hits.set(key, times);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - times.length));

  if (times.length > limit) {
    res.setHeader('Retry-After', Math.ceil(WINDOW_MS / 1000));
    return res.status(429).json({
      error: 'rate_limited',
      detail: 'Too many requests — please wait a moment and try again.',
    });
  }
  next();
});

// Deliberately open CORS: the API is public, read-mostly, and contains nothing
// private. Locking it down would only make the single-file demo harder to host.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// A tiny request log — enough to see the funnel moving during a demo.
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  const started = Date.now();
  res.on('finish', () => {
    const flag = res.statusCode >= 400 ? '!' : ' ';
    console.log(` ${flag} ${req.method} ${req.path} → ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});

app.use('/api', createApi());

app.get('/api', (_req, res) =>
  res.json({ service: 'ai-project-launchpad-api', docs: 'see README §15', endpoints: 14 }),
);

app.use(express.static(ROOT, {
  setHeaders(res, path) {
    if (path.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
  index: false,
}));

// SPA fallback — every non-asset, non-API path serves the shell.
// Express 5 removed bare '*' route patterns, so this is a plain middleware:
// anything that reached here was not found on disk, so if it has no file
// extension it is an app route (/admin, /join?ref=…) and gets the shell.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api')) return next();
  if (extname(req.path)) return next(); // a missing real file should 404 honestly
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(SHELL);
});

app.use((_req, res) => res.status(404).type('text/plain').send('404 Not Found'));

const db = getDb();
if (!getMeta('campaign_target')) setMeta('campaign_target', 500);

/**
 * Only listen when run directly (`node server/server.mjs`). Importing this
 * module — from a test, or to grab `app` and drive it with supertest — must not
 * grab a port as a side effect.
 *
 * The comparison goes through `pathToFileURL` on purpose: the old
 * `file://${process.argv[1]}` only ever matched POSIX paths. On Windows,
 * argv[1] is `C:\Users\…\server.mjs` — backslashes, drive letters and the
 * spaces in a real user folder — so the URL never matched, `start()` silently
 * never ran, and `npm start` exited with no output at all.
 */
const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
function sameFile(a, b) {
  if (a === b) return true;
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return process.platform === 'win32' && a.toLowerCase() === b.toLowerCase();
  }
}
const isDirectRun = !!invokedPath && sameFile(invokedPath, modulePath);

if (isDirectRun) start();

function start() {
  app.listen(PORT, '0.0.0.0', () => {
  const stats = getStats(Number(getMeta('campaign_target', 500)));
  console.log(
    `\n  AI Project Launchpad\n` +
      `  app + API   → http://0.0.0.0:${PORT}${useSingle ? '   (single-file build)' : ''}\n` +
      `  database    → ${getMeta('db_path') ?? 'data/launchpad.db'}  ·  ${stats.total} registrations\n` +
      `  api         → /api/health · /api/stats · /api/leaderboard · /api/messages (admin behind login)\n`,
  );
  });
}

// Export the app so tests can drive it without binding a port twice.
export { app };