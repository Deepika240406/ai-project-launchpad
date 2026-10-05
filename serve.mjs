/**
 * Zero-dependency static server for the production build.
 *
 * Why not `vite preview`: this needs to behave exactly like the deploy target —
 * SPA fallback for /admin, /strategy and /join?ref=CODE, immutable asset caching,
 * correct MIME types for the manifest and icons, and it must bind 0.0.0.0 so the
 * sandbox can proxy it as a public URL.
 *
 *   node serve.mjs [port]
 *
 * SELF-HEALING: `dist/` is a build output and is deliberately not tracked, so in
 * a fresh environment it may be absent. Rather than serving a 404 and looking
 * broken, this falls back to `standalone-preview.html` — the same app, built as
 * one self-contained file — and says so on startup. Run `npm run build` for the
 * full multi-file build with the icons, manifest and per-route assets.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4173);

/** Prefer the real build; fall back to the single-file build. */
const DIST = resolve('dist');
const SINGLE = resolve('standalone-preview.html');
const useSingle = !existsSync(join(DIST, 'index.html')) && existsSync(SINGLE);
const ROOT = useSingle ? resolve('.') : DIST;
const SHELL = useSingle ? SINGLE : join(DIST, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
};

async function tryFile(path) {
  try {
    const s = await stat(path);
    if (!s.isFile()) return null;
    return { path, size: s.size, mtime: s.mtime };
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  // Prevent path traversal
  const safe = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(ROOT, safe);

  let file = await tryFile(filePath);
  if (!file && !extname(safe)) {
    const withHtml = await tryFile(`${filePath}.html`);
    if (withHtml) file = withHtml;
  }
  // SPA fallback — unknown route serves the app shell. In single-file mode that
  // is the same document for every path, so /admin and /strategy still resolve.
  if (!file && !extname(safe)) file = await tryFile(SHELL);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = extname(file.path).toLowerCase();
  const immutable = file.path.includes('/assets/');
  const body = await readFile(file.path);

  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  if (req.method === 'HEAD') res.end();
  else res.end(body);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    useSingle
      ? `AI Project Launchpad (single-file build) → http://0.0.0.0:${PORT}\n` +
          `  dist/ not found, so serving standalone-preview.html. Run \`npm run build\` for the full build.`
      : `AI Project Launchpad (production build) → http://0.0.0.0:${PORT}`,
  );
});
