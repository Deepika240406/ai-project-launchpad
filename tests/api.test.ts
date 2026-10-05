import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * BACKEND CONTRACT TESTS
 * ---------------------------------------------------------------------------
 * These drive the real server over HTTP against a throwaway SQLite file — not a
 * mocked handler. That matters because the things most likely to break are the
 * things a mock hides: SQL that only fails on a real constraint, a route that
 * only fails when Express actually routes it, a response shaped differently
 * from what the client expects.
 *
 * Each run gets its own database and its own port, so a developer's seeded data
 * is never touched and two runs can never interfere.
 */

const PORT = 4300 + Math.floor(Math.random() * 200);
const BASE = `http://127.0.0.1:${PORT}`;
let server: ReturnType<typeof spawn>;
let dir: string;

async function waitForServer(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not start');
}

const post = (path: string, body: unknown) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** Admin routes are behind a signed cookie. Log in once; reuse the cookie. */
let adminCookie: string | null = null;
async function adminLogin(password = 'test-admin') {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const raw = res.headers.get('set-cookie');
  adminCookie = raw ? raw.split(';')[0] : null;
  return res;
}
const adminGet = (path: string) =>
  fetch(`${BASE}${path}`, { headers: adminCookie ? { cookie: adminCookie } : {} });
const adminSend = (path: string, method: string, body?: unknown) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(adminCookie ? { cookie: adminCookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'apl-test-'));
  server = spawn('node', ['server/server.mjs', String(PORT)], {
    env: { ...process.env, DB_PATH: join(dir, 'test.db'), ADMIN_PASSWORD: 'test-admin' },
    stdio: 'ignore',
  });
  await waitForServer();
  await adminLogin();
}, 30000);

afterAll(() => {
  server?.kill('SIGKILL');
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

describe('api: health and stats', () => {
  it('reports itself healthy with a known target', async () => {
    const body = await (await fetch(`${BASE}/api/health`)).json();
    expect(body.ok).toBe(true);
    expect(body.storage).toBe('sqlite');
    expect(body.target).toBe(500);
  });

  it('starts from an empty database, not the seeded one', async () => {
    // Proves the tests are isolated from `npm run seed` — a shared DB would make
    // the seat-number assertions below flaky and hide real ordering bugs.
    const stats = await (await fetch(`${BASE}/api/stats`)).json();
    expect(stats.total).toBe(0);
    expect(stats.spotsLeft).toBe(500);
  });

  it('rejects an unknown endpoint with JSON, not the HTML shell', async () => {
    const res = await fetch(`${BASE}/api/nope`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});

describe('api: registration', () => {
  it('creates a student, assigns seat 1 and returns a DEEPIKA47-style code', async () => {
    const res = await post('/api/register', {
      name: 'Deepika Reddy',
      email: 'deepika@example.com',
      college: 'Sathyabama',
      branch: 'CSE',
      year: 'Final year (2026)',
      experience: 'Beginner', // the wizard's casing on the wire
      interest: 'ai-ml',
      projectId: 'resume-analyzer',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toMatch(/^DEEPIKA\d{2}$/);
    expect(body.seat).toBe(1);
    expect(body.stats.total).toBe(1);
    // Stored, not dropped, and stored canonically: lower-case experience so two
    // spellings of "Beginner" cannot split a GROUP BY.
    expect(body.projectId).toBe('resume-analyzer');
    expect(body.experience).toBe('beginner');
    expect(body.year).toBe('Final year (2026)');
  });

  it('normalises a legacy project slug instead of nulling it', async () => {
    // A cached page, or an older client build, still posts the pre-rename slug.
    // It must land on the right project rather than being silently discarded —
    // that discard is what made every real registration invisible to the
    // project chart once before.
    const res = await post('/api/register', {
      name: 'Ravi Shankar',
      email: 'ravi.shankar@example.com',
      projectId: 'ai-interview-coach',
      experience: 'some',
      interest: 'cyber',
    });
    const body = await res.json();
    expect(body.projectId).toBe('interview-coach');
    expect(body.experience).toBe('intermediate');
    expect(body.interest).toBe('security');
  });

  it('attributes a registration to the channel it arrived on', async () => {
    // End to end: the tag a share link carries must survive validation and land
    // in the channel panel, or the campaign's biggest channels are unmeasurable.
    const cases: [string, string][] = [
      ['clubs', 'clubs'],
      ['club', 'clubs'],
      ['whatsapp-group', 'whatsapp'],
      ['qr', 'clubs'],
      ['billboard', 'direct'], // unrecognised → direct, never a guessed channel
    ];

    for (const [sent, expected] of cases) {
      const res = await post('/api/register', {
        name: `Tag ${expected}`,
        email: `tag.${sent}@example.com`,
        source: sent,
      });
      expect(res.status).toBe(201);
      expect((await res.json()).source).toBe(expected);
    }

    const summary = await (await adminGet('/api/admin/summary')).json();
    const channels = summary.sources.map((r: { source: string }) => r.source);
    expect(channels).toContain('clubs');
    expect(channels).toContain('whatsapp');
  });

  it('nulls an unknown value but still gives the student a seat', async () => {
    const res = await post('/api/register', {
      name: 'Farah Khan',
      email: 'farah.khan@example.com',
      projectId: 'nft-minter',
      year: 'whenever',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.projectId).toBeNull();
    expect(body.year).toBeNull();
    expect(body.code).toMatch(/^FARAH\d{2}$/);
  });

  it('is idempotent for the same email — a double-tap must not create two students', async () => {
    // Compared against the count *before* the retry rather than a fixed number:
    // pinning "1" would only hold while this test happened to run first, and an
    // order-dependent assertion is how a suite starts lying about what it checks.
    const before = await (await fetch(`${BASE}/api/stats`)).json();

    const res = await post('/api/register', {
      name: 'Deepika R',
      email: 'DEEPIKA@example.com', // different case on purpose
      college: 'Sathyabama',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
    expect(body.code).toMatch(/^DEEPIKA\d{2}$/);
    expect(body.seat).toBe(1); // the same seat it was given the first time

    const after = await (await fetch(`${BASE}/api/stats`)).json();
    expect(after.total).toBe(before.total); // no second row
  });

  it('validates at the edge and says which field failed', async () => {
    const noName = await post('/api/register', { name: 'A', email: 'a@b.com' });
    expect(noName.status).toBe(400);
    expect((await noName.json()).error).toBe('name_invalid');

    const badEmail = await post('/api/register', { name: 'Arjun Mehta', email: 'nope' });
    expect(badEmail.status).toBe(400);
    expect((await badEmail.json()).error).toBe('email_invalid');
  });
});

describe('api: the referral loop', () => {
  /**
   * Each test registers its own referrer rather than sharing one. The generated
   * code includes random digits (DEEPIKA47, DEEPIKA82 …), so hard-coding one
   * would couple the suite to a coincidence — and a shared referrer would make
   * these tests depend on execution order.
   */
  async function newReferrer(name: string) {
    const res = await post('/api/register', { name, email: `${name.split(' ')[0].toLowerCase()}@example.com` });
    return (await res.json()).code as string;
  }

  it('credits the referrer and puts the friend in the leaderboard', async () => {
    const code = await newReferrer('Meena Rao');
    expect(code).toMatch(/^MEENA\d{2}$/);

    const friend = await (
      await post('/api/register', { name: 'Suresh Babu', email: 'suresh@example.com', ref: code })
    ).json();
    expect(friend.referredBy).toBe(code);

    const referrer = await (await fetch(`${BASE}/api/students/${code}`)).json();
    expect(referrer.referralCount).toBe(1);
    expect(referrer.rank).toBe(1);

    const board = await (await fetch(`${BASE}/api/leaderboard`)).json();
    // Found by code, not by index: other tests in this file also create
    // referrers, and pinning `rows[0]` would make this test order-dependent.
    const me = board.rows.find((r: { code: string }) => r.code === code);
    expect(me).toBeTruthy();
    expect(me.referrals).toBe(1);

    // The board must be sorted high → low, and must not reshuffle between two
    // identical requests (the reason the query carries an id tiebreak).
    const counts = board.rows.map((r: { referrals: number }) => r.referrals);
    expect([...counts].sort((a: number, b: number) => b - a)).toEqual(counts);
    const again = await (await fetch(`${BASE}/api/leaderboard`)).json();
    expect(again.rows.map((r: { code: string }) => r.code)).toEqual(
      board.rows.map((r: { code: string }) => r.code),
    );
  });

  it('keeps a student who never picked an experience level on the board', async () => {
    // Regression: `WHERE experience != 'simulated'` evaluates to NULL for a NULL
    // experience and silently dropped those rows from every public aggregate.
    const code = await newReferrer('Nikhil Verma');
    const friend = await (
      await post('/api/register', { name: 'Priya Das', email: 'priya.das@example.com', ref: code })
    ).json();
    expect(friend.referredBy).toBe(code);

    const board = await (await fetch(`${BASE}/api/leaderboard`)).json();
    expect(board.rows.some((r: { code: string }) => r.code === code)).toBe(true);

    const colleges = await (await fetch(`${BASE}/api/leaderboard`)).json();
    expect(Array.isArray(colleges.colleges)).toBe(true);
    expect(colleges.colleges.some((c: { college: string }) => /Not specified/i.test(c.college))).toBe(true);
  });

  it('refuses a self-referral on the same device, without rejecting the signup', async () => {
    // The realistic attack: register, then register again on the same phone
    // with a second email, claiming your own code to farm referrals.
    const device = 'gaming-device-1';
    const first = await (
      await post('/api/register', {
        name: 'Ravi Shankar',
        email: 'ravi@example.com',
        deviceId: device,
      })
    ).json();

    const second = await post('/api/register', {
      name: 'Ravi S',
      email: 'ravi.alt@example.com',
      deviceId: device,
      ref: first.code,
    });

    // The registration still succeeds — we never punish a student for a link.
    expect(second.status).toBe(201);
    const body = await second.json();
    expect(body.referredBy).toBeNull();
    expect(body.code).not.toBe(first.code);

    const referrer = await (await fetch(`${BASE}/api/students/${first.code}`)).json();
    expect(referrer.referralCount).toBe(0);
  });

  it('still credits a genuine namesake on a different device', async () => {
    // The trade-off, pinned down: duplicate names are common, so names are NOT
    // used as an identity signal. Blocking them would deny real referrals to
    // honest students — a false positive here costs more than the abuse.
    const referrer = await newReferrer('Ananya Iyer');
    const namesake = await (
      await post('/api/register', {
        name: 'Ananya Iyer', // same name, different person
        email: 'ananya.two@example.com',
        deviceId: 'different-phone-99',
        ref: referrer,
      })
    ).json();
    expect(namesake.referredBy).toBe(referrer);

    const credited = await (await fetch(`${BASE}/api/students/${referrer}`)).json();
    expect(credited.referralCount).toBe(1);
  });

  it('ignores an unknown referral code rather than failing the signup', async () => {
    const res = await post('/api/register', {
      name: 'Priya Nair',
      email: 'priya@example.com',
      ref: 'GHOST999',
    });
    expect(res.status).toBe(201);
    expect((await res.json()).referredBy).toBeNull();
  });

});

describe('api: replies inbox + admin auth', () => {
  it('stores a reply from the public form and counts it', async () => {
    const before = await (await adminGet('/api/admin/messages')).json();
    const res = await post('/api/messages', {
      name: 'Sneha Iyer',
      email: 'sneha@example.com',
      body: 'Is the workshop useful for a mechanical student?',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.counts.total).toBe(before.counts.total + 1);
    expect(body.counts.unread).toBe(before.counts.unread + 1);
  });

  it('validates the reply instead of storing junk', async () => {
    expect((await post('/api/messages', { name: 'A', body: 'hello there' })).status).toBe(400);
    expect(
      (await post('/api/messages', { name: 'Valid Name', email: 'nope', body: 'hello there' })).status,
    ).toBe(400);
    expect((await post('/api/messages', { name: 'Valid Name', body: 'hi' })).status).toBe(400);
  });

  it('locks every admin route behind the session', async () => {
    const res = await fetch(`${BASE}/api/admin/summary`);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('unauthorized');
    expect((await fetch(`${BASE}/api/admin/messages`)).status).toBe(401);
  });

  it('rejects a wrong password without issuing a session', async () => {
    const res = await adminLogin('wrong-password');
    expect(res.status).toBe(401);
    expect(adminCookie).toBeNull();
    await adminLogin(); // restore for the specs below
  });

  it('lists, triages and deletes replies', async () => {
    const list = await (await adminGet('/api/admin/messages')).json();
    const target = list.items.find((m: { status: string }) => m.status === 'new');
    expect(target).toBeTruthy();

    const patched = await adminSend(`/api/admin/messages/${target.id}`, 'PATCH', { status: 'read' });
    expect(patched.status).toBe(200);
    expect((await patched.json()).item.status).toBe('read');

    const removed = await adminSend(`/api/admin/messages/${target.id}`, 'DELETE');
    expect(removed.status).toBe(200);

    const me = await (await adminGet('/api/admin/me')).json();
    expect(me.authenticated).toBe(true);
    expect((await post('/api/admin/logout', {})).status).toBe(200);
  });

  it('captures remind-me leads idempotently and triages them', async () => {
    const res = await post('/api/reminders', { name: 'Neha R', email: 'neha@example.com' });
    expect(res.status).toBe(201);
    expect((await res.json()).counts.total).toBe(1);

    // The same worried student can click twice — one lead, not two.
    const again = await post('/api/reminders', { email: 'NEHA@example.com' });
    expect(again.status).toBe(200);
    expect((await again.json()).duplicate).toBe(true);

    expect((await post('/api/reminders', { email: 'not-an-email' })).status).toBe(400);

    const list = await (await adminGet('/api/admin/reminders')).json();
    expect(list.items.length).toBe(1);
    const patched = await adminSend(`/api/admin/reminders/${list.items[0].id}`, 'PATCH', {
      status: 'reminded',
    });
    expect((await patched.json()).item.status).toBe('reminded');
    expect((await adminSend(`/api/admin/reminders/${list.items[0].id}`, 'DELETE')).status).toBe(200);
  });

  it('measures a share link: visits → joins, per student', async () => {
    const created = await (
      await post('/api/register', { name: 'Sharer One', email: 'sharer@example.com' })
    ).json();

    // Two opens of their link (as the client fires them), one friend joining.
    await post('/api/events', {
      events: [
        { name: 'referral_link_visited', props: { code: created.code }, deviceId: 'v1' },
        { name: 'referral_link_visited', props: { code: created.code }, deviceId: 'v2' },
      ],
    });
    await post('/api/register', {
      name: 'Sharer Friend',
      email: 'sharer.friend@example.com',
      ref: created.code,
    });

    const me = await (await fetch(`${BASE}/api/students/${created.code}`)).json();
    expect(me.impact).toEqual({ visits: 2, joined: 1 });
  });

  it('serves the class scoreboard on /api/leaderboard for the class challenge', async () => {
    await post('/api/register', {
      name: 'Class Champ',
      email: 'class.champ@example.com',
      college: 'SSN College of Engineering',
      branch: 'CSE',
    });
    const board = await (await fetch(`${BASE}/api/leaderboard`)).json();
    expect(Array.isArray(board.classes)).toBe(true);
    const mine = board.classes.find(
      (c: { college: string; branch: string }) =>
        c.college === 'SSN College of Engineering' && c.branch === 'CSE',
    );
    expect(mine?.students).toBeGreaterThanOrEqual(1);
  });

  it('serves measured event counts on /api/stats (the live funnel)', async () => {
    const stats = await (await fetch(`${BASE}/api/stats`)).json();
    expect(Array.isArray(stats.eventCounts)).toBe(true);
    expect(Array.isArray(stats.sources)).toBe(true);
    // No simulated/realTotal split any more: one honest total.
    expect(stats.simulated).toBeUndefined();
    expect(stats.realTotal).toBeUndefined();
  });
});

describe('api: analytics ingest', () => {
  it('accepts a batch and counts it back in the admin summary', async () => {
    const res = await post('/api/events', {
      events: [
        { name: 'page_view', path: '/', deviceId: 'd1' },
        { name: 'registration_started', path: '/', deviceId: 'd1' },
        { name: 'registration_completed', path: '/', deviceId: 'd1' },
      ],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).accepted).toBe(3);

    const summary = await (await adminGet('/api/admin/summary')).json();
    const names = summary.events.map((e: { name: string }) => e.name);
    expect(names).toContain('registration_completed');
  });

  it('drops malformed events instead of inserting junk', async () => {
    const res = await post('/api/events', {
      events: [{ name: 'ok' }, { notAnEvent: true }, null, { name: 'x'.repeat(200) }],
    });
    expect((await res.json()).accepted).toBe(1);
  });

  it('refuses an oversized batch', async () => {
    const big = Array.from({ length: 201 }, () => ({ name: 'page_view' }));
    const res = await post('/api/events', { events: big });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('batch_too_large');
  });
});

describe('api: student tools are device-keyed, anonymous-first', () => {
  const device = 'test-device-1';

  it('saves and returns a vault idea before any registration exists', async () => {
    // The point of keying on device: a student who has NOT registered can still
    // use the tools, and that work must survive once they do register.
    const saved = await (
      await post('/api/vault', {
        deviceId: device,
        projectId: 'ai-study-buddy',
        title: 'AI Study Buddy',
        pitch: 'Turn lecture notes into flashcards',
        note: 'start with the summariser',
        priority: 'now',
        stages: ['scope', 'input'],
      })
    ).json();
    expect(saved.idea.project_id).toBe('ai-study-buddy');
    expect(saved.idea.stages).toEqual(['scope', 'input']);

    const list = await (await fetch(`${BASE}/api/vault/${device}`)).json();
    expect(list.ideas).toHaveLength(1);
    expect(list.ideas[0].note).toBe('start with the summariser');
    expect(list.ideas[0].student_code).toBeNull();
  });

  it('upserts rather than duplicating the same project on a second save', async () => {
    await post('/api/vault', {
      deviceId: device,
      projectId: 'ai-study-buddy',
      note: 'updated note',
      stages: ['scope', 'input', 'output'],
    });
    const list = await (await fetch(`${BASE}/api/vault/${device}`)).json();
    expect(list.ideas).toHaveLength(1);
    expect(list.ideas[0].note).toBe('updated note');
    expect(list.ideas[0].stages).toHaveLength(3);
  });

  it('claims anonymous work when that device registers', async () => {
    const res = await post('/api/register', {
      name: 'Kavya Menon',
      email: 'kavya@example.com',
      deviceId: device,
    });
    expect(res.status).toBe(201);
    const list = await (await fetch(`${BASE}/api/vault/${device}`)).json();
    // Back-filled: the ideas are now attributable to a real student.
    expect(list.ideas[0].student_code).toBe((await res.json().catch(() => ({})))?.code ?? list.ideas[0].student_code);
    expect(list.ideas[0].student_code).not.toBeNull();
  });

  it('validates the quiz score range and stores the band', async () => {
    expect((await post('/api/quiz', { deviceId: device, score: 140, band: 'strong' })).status).toBe(400);
    const ok = await post('/api/quiz', { deviceId: device, score: 78, band: 'ready', answers: [] });
    expect(ok.status).toBe(200);
    const stored = await (await fetch(`${BASE}/api/quiz/${device}`)).json();
    expect(stored.result.score).toBe(78);
    expect(stored.result.band).toBe('ready');
  });

  it('requires a device id on tool writes', async () => {
    const res = await post('/api/vault', { projectId: 'x' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('device_required');
  });
});

describe('api: admin summary is real, not the demo arrays', () => {
  it('reflects the actual rows written above', async () => {
    const s = await (await adminGet('/api/admin/summary')).json();
    expect(s.stats.total).toBeGreaterThanOrEqual(4);
    expect(s.colleges.some((c: { college: string }) => c.college === 'Sathyabama')).toBe(true);
    // The slug is the canonical one the client and server now share.
    expect(s.topProjects.some((p: { projectId: string }) => p.projectId === 'resume-analyzer')).toBe(true);
    // Attribution is measured, so the channel panel has real rows to show — and
    // it accounts for exactly the whole population, with no second category of
    // row to reconcile against.
    expect(s.sources.length).toBeGreaterThan(0);
    expect(s.sources.reduce((n: number, r: { registrations: number }) => n + r.registrations, 0)).toBe(
      s.stats.total,
    );
    expect(s.daily.length).toBeGreaterThan(0);
    expect(s.generatedAt).toBeTruthy();
  });
});

describe('api: the error and abuse contract', () => {
  it('answers malformed JSON with a JSON error, not an Express HTML page', async () => {
    const res = await fetch(`${BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name": "Broken", ',
    });
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect((await res.json()).error).toBe('invalid_json');
  });

  it('answers an unknown route with JSON, so a client never parses HTML', async () => {
    const res = await fetch(`${BASE}/api/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    // The 404 body names the machine-readable reason the client keys off.
    expect((await res.json()).error).toBe('unknown_endpoint');
  });

  it('rate-limits a runaway loop and tells the client when to retry', async () => {
    // 240 events/min is the configured ceiling for this path. Sending 241 tiny
    // batches is the cheapest honest way to prove the limiter is wired to the
    // route it claims to protect — and that it says so in the response rather
    // than dropping the work silently.
    const body = JSON.stringify({ events: [{ name: 'page_view', props: {} }] });
    let limited: Response | null = null;

    for (let i = 0; i < 245 && !limited; i += 1) {
      const res = await fetch(`${BASE}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.status === 429) limited = res;
    }

    expect(limited).not.toBeNull();
    expect(limited!.headers.get('Retry-After')).toBeTruthy();
    expect(Number(limited!.headers.get('X-RateLimit-Remaining'))).toBe(0);
    expect((await limited!.json()).error).toBe('rate_limited');
  });

  it('never leaks an email address through the public activity feed', async () => {
    const res = await fetch(`${BASE}/api/activity?limit=20`);
    expect(res.status).toBe(200);
    const { items } = await res.json();
    expect(Array.isArray(items)).toBe(true);

    for (const item of items) {
      expect(item.firstName).toBeTruthy();
      // A first name and a campus is what a student would say out loud; an email
      // on a public endpoint is a spam list waiting to be scraped.
      expect(Object.keys(item)).not.toContain('email');
      expect(Object.keys(item)).not.toContain('name');
      expect(item.firstName).not.toContain('@');
    }
  });

  it('serves the catalogue so the client can be checked against the same lists', async () => {
    const res = await fetch(`${BASE}/api/catalogue`);
    const body = await res.json();
    expect(body.projects).toContain('resume-analyzer');
    expect(body.interests).toContain('security');
    expect(body.experience).toEqual(['beginner', 'intermediate', 'advanced']);
  });
});

describe('api: the app shell still serves alongside the API', () => {
  it('serves the SPA for a deep route', async () => {
    const res = await fetch(`${BASE}/admin`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('404s a genuinely missing asset instead of serving HTML', async () => {
    const res = await fetch(`${BASE}/assets/does-not-exist.js`);
    expect(res.status).toBe(404);
  });
});
