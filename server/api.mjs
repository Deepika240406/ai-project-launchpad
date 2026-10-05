/**
 * API — every route in one table, every handler small.
 *
 * Conventions
 *  · All responses are JSON and all failures share one shape: { error, detail }.
 *  · Validation happens at the edge and returns 400 with a machine-readable
 *    `error` code, so the client can show the right field-level message instead
 *    of "something went wrong".
 *  · Writes are idempotent where the client is allowed to retry (register by
 *    email, vault by device+project) — a flaky phone connection must not create
 *    two students.
 */
import crypto from 'node:crypto';
import { Router } from 'express';
import * as db from './db.mjs';
import {
  EXPERIENCE,
  INTERESTS,
  PROJECT_IDS,
  SOURCES,
  YEARS,
  WORKSHOP_DATE,
  cleanText,
  normalizeExperience,
  normalizeInterest,
  normalizeProjectId,
  normalizeSource,
  normalizeYear,
} from './catalogue.mjs';

const TARGET = Number(process.env.CAMPAIGN_TARGET ?? 500);

/* ─────────────────────────────────────────────────────────── validation */

const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const str = (v, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function badRequest(res, error, detail) {
  return res.status(400).json({ error, detail });
}

/* ─────────────────────────────────────────────────── admin sessions */
/**
 * Stateless signed cookie — no session table, no dependency.
 *   token = 'apl.<expiry-ms>.<hmac(expiry)>'
 * The HMAC covers the expiry, so a tampered token fails to verify; and the
 * compare is timing-safe because it guards a password-equivalent.
 */
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'launchpad';
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.createHash('sha256').update(`apl-admin-secret:${ADMIN_PASSWORD}`).digest('hex');
const SESSION_MS = 12 * 60 * 60 * 1000;

function signSession() {
  const exp = Date.now() + SESSION_MS;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(`apl.${exp}`).digest('base64url');
  return { token: `apl.${exp}.${sig}`, exp };
}

function verifySession(token) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3 || parts[0] !== 'apl') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`apl.${exp}`)
    .digest();
  const given = Buffer.from(parts[2] ?? '', 'base64url');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function adminToken(req) {
  const cookie = String(req.headers.cookie ?? '');
  const fromCookie = /(?:^|;\s*)apl_admin=([^;]+)/.exec(cookie);
  const bearer = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization ?? ''));
  return fromCookie?.[1] || bearer?.[1] || null;
}

function requireAdmin(req, res, next) {
  if (verifySession(adminToken(req))) return next();
  return res.status(401).json({ error: 'unauthorized', detail: 'Admin login required.' });
}

function passwordsMatch(given) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ─────────────────────────────────────────────────────────────── router */

export function createApi() {
  const api = Router();

  /* ------------------------------------------------------------- health */
  api.get('/health', (_req, res) => {
    let students = 0;
    try {
      students = db.countStudents();
    } catch (e) {
      return res.status(503).json({ ok: false, error: 'db_unavailable', detail: String(e.message) });
    }
    res.json({
      ok: true,
      service: 'ai-project-launchpad-api',
      version: 1,
      storage: 'sqlite',
      target: TARGET,
      students,
      time: new Date().toISOString(),
    });
  });

  /* -------------------------------------------------------------- stats */
  api.get('/stats', (_req, res) => {
    // `eventCounts` is the LIVE funnel — every stage counted from real product
    // analytics rows, never modelled. It replaces the old projected funnel.
    res.json({ ...db.getStats(TARGET), eventCounts: db.getEventCounts(20), sources: db.getSourceBreakdown(6) });
  });

  /* ----------------------------------------------------------- register */
  api.post('/register', (req, res) => {
    const body = req.body ?? {};

    const name = str(body.name);
    const email = str(body.email).toLowerCase();

    if (name.length < 2) return badRequest(res, 'name_invalid', 'Please enter your full name.');
    if (!isEmail(email)) return badRequest(res, 'email_invalid', 'That email does not look right.');

    // Idempotent: the same email returns the same student rather than a 409,
    // because the most likely cause is a double-tap on a slow connection.
    const existing = db.getStudentByEmail(email);
    if (existing) {
      return res.status(200).json({
        ...shapeStudent(existing),
        duplicate: true,
        campus: db.collegeStanding(existing.college),
        impact: db.linkImpact(existing.code),
        referralCount: db.referralCount(existing.code),
        rank: db.rankOf(existing.code),
        stats: db.getStats(TARGET),
      });
    }

    // Enrichment fields are validated against the catalogue; a value we do not
    // recognise becomes null rather than failing a real student's signup.
    // Attributed onto one of the six measured channels. An unrecognised tag
    // becomes null and the row is filed as direct — never as a channel it might
    // not be, and never dropped.
    const source = normalizeSource(body.source) ?? 'direct';

    const created = db.createStudent({
      name,
      email,
      college: cleanText(body.college, 120),
      branch: cleanText(body.branch, 60),
      // Normalised, not merely validated: a legacy slug is rewritten to the
      // canonical one, and the year keeps its canonical spelling, so one project
      // can never appear as two rows in a chart.
      year: normalizeYear(body.year),
      experience: normalizeExperience(body.experience),
      interest: normalizeInterest(body.interest),
      projectId: normalizeProjectId(body.projectId),
      ref: body.ref ? str(body.ref, 24).toUpperCase() : null,
      source,
      deviceId: str(body.deviceId, 64) || null,
    });

    res.status(201).json({
      ...shapeStudent(db.getStudentByCode(created.code)),
      referredBy: created.referredBy,
      source: created.source,
      // Exact campus standing at the moment of joining — the success screen's
      // "you're #4 from SSN" must never be a guess from a top-N list.
      campus: db.collegeStanding(created.college ?? body.college),
      impact: { visits: 0, joined: 0 },
      referralCount: 0,
      rank: db.rankOf(created.code),
      stats: db.getStats(TARGET),
    });
  });

  /* -------------------------------------------------------------- activity */
  /**
   * Powers the live activity ticker. Public, because it is the single strongest
   * piece of social proof on the page — and it returns only first name + college,
   * never a surname, email or code.
   */
  api.get('/activity', (req, res) => {
    const limit = Math.min(30, Math.max(1, Number(req.query.limit ?? 12)));
    res.json({ items: db.getRecentActivity(limit), updatedAt: new Date().toISOString() });
  });

  /* ------------------------------------------------------------ catalogue */
  /**
   * The canonical list of projects and interests the API will accept. The
   * frontend uses its own copy for rendering (it must work offline), and
   * `tests/api.test.ts` asserts the two agree — so a mismatch fails CI instead
   * of silently rejecting real students in production.
   */
  api.get('/catalogue', (_req, res) => {
    res.json({
      projects: PROJECT_IDS,
      interests: INTERESTS,
      experience: EXPERIENCE,
      years: YEARS,
      sources: SOURCES,
      workshopDate: WORKSHOP_DATE,
    });
  });

  /* ---------------------------------------------------------- leaderboard */
  api.get('/leaderboard', (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const you = req.query.you ? String(req.query.you).toUpperCase() : null;
    const rows = db.getLeaderboard(limit).map((r, i) => ({
      rank: i + 1,
      code: r.code,
      name: r.name,
      college: r.college,
      joinedAt: r.joinedAt,
      referrals: r.referrals,
      isYou: you ? r.code === you : false,
    }));
    const totalReferrals = db.getDb().prepare('SELECT COUNT(*) AS n FROM referrals').get().n;
    res.json({
      rows,
      colleges: db.getCollegeScoreboard(8),
      // The class-vs-class challenge: (college, branch) cohorts with real counts.
      classes: db.getClassScoreboard(8),
      totalReferrals,
      updatedAt: new Date().toISOString(),
    });
  });

  /* ------------------------------------------------------ one student */
  api.get('/students/:code', (req, res) => {
    const student = db.getStudentByCode(String(req.params.code).toUpperCase());
    if (!student) return res.status(404).json({ error: 'not_found', detail: 'Unknown referral code.' });
    res.json({
      ...shapeStudent(student),
      referralCount: db.referralCount(student.code),
      rank: db.rankOf(student.code),
      referredBy: student.referred_by,
      impact: db.linkImpact(student.code),
      // First name + college only — a student can see who joined through their
      // link without anyone's email or surname being exposed.
      friends: db.referredFriends(student.code).map((f) => ({
        name: String(f.name).split(' ')[0],
        college: f.college,
        joinedAt: f.joinedAt,
      })),
    });
  });

  /* -------------------------------------------------------------- events */
  api.post('/events', (req, res) => {
    const list = Array.isArray(req.body) ? req.body : Array.isArray(req.body?.events) ? req.body.events : [];
    if (!list.length) return res.json({ accepted: 0 });
    if (list.length > 200) return badRequest(res, 'batch_too_large', 'Max 200 events per batch.');
    const clean = list
      .filter((e) => e && typeof e.name === 'string' && e.name.length <= 60)
      .map((e) => ({
        name: e.name,
        props: e.props && typeof e.props === 'object' ? e.props : {},
        path: str(e.path, 120) || null,
        sessionId: str(e.sessionId, 64) || null,
        deviceId: str(e.deviceId, 64) || null,
      }));
    res.json({ accepted: db.insertEvents(clean) });
  });

  /* ------------------------------------------------------------- messages */
  /**
   * The public "send a reply / ask a question" box. Stored, not forwarded —
   * the inbox on /admin is the other end of this table. Abuse is bounded by
   * the per-IP rate limit and a hard length cap, not by trust.
   */
  api.post('/messages', (req, res) => {
    const name = str(req.body?.name, 60);
    const email = str(req.body?.email, 120).toLowerCase();
    const body = str(req.body?.body, 2000);

    if (name.length < 2) return badRequest(res, 'name_invalid', 'Please enter your name.');
    if (email && !isEmail(email)) return badRequest(res, 'email_invalid', 'That email does not look right.');
    if (body.length < 5) return badRequest(res, 'message_invalid', 'Please write a little more.');

    const created = db.createMessage({
      name,
      email: email || null,
      body,
      deviceId: str(req.body?.deviceId, 64) || null,
    });
    res.status(201).json({ ok: true, id: created.id, counts: db.messageCounts() });
  });

  /**
   * "Remind me" — the soft commitment. A student who is interested but not
   * ready gives an email instead of bouncing. Idempotent per email, because
   * the same worried student can click it twice.
   */
  api.post('/reminders', (req, res) => {
    const name = str(req.body?.name, 60);
    const email = str(req.body?.email, 120).toLowerCase();
    if (!isEmail(email)) return badRequest(res, 'email_invalid', 'That email does not look right.');

    const d = db.getDb();
    const existing = d.prepare(`SELECT * FROM reminders WHERE lower(email) = ?`).get(email);
    if (existing) return res.status(200).json({ ok: true, id: existing.id, duplicate: true });

    const created = db.createReminder({ name: name || null, email });
    res.status(201).json({ ok: true, id: created.id, counts: db.reminderCounts() });
  });

  /* --------------------------------------------------------------- admin */
  // Login and session-check are public; everything else under /admin is not.
  api.post('/admin/login', (req, res) => {
    if (!passwordsMatch(req.body?.password)) {
      return res.status(401).json({ error: 'unauthorized', detail: 'Wrong password.' });
    }
    const { token, exp } = signSession();
    res.setHeader(
      'Set-Cookie',
      `apl_admin=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}` +
        (req.secure ? '; Secure' : ''),
    );
    res.json({ ok: true, expiresAt: new Date(exp).toISOString() });
  });

  api.post('/admin/logout', (_req, res) => {
    res.setHeader('Set-Cookie', 'apl_admin=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
    res.json({ ok: true });
  });

  api.get('/admin/me', (req, res) => {
    res.json({ authenticated: verifySession(adminToken(req)) });
  });

  api.use('/admin', requireAdmin);

  api.get('/admin/summary', (_req, res) => {
    const stats = db.getStats(TARGET);
    res.json({
      stats,
      // Real attribution, measured from each registration's own source field —
      // this replaces the projected channel table for anyone reading live data.
      sources: db.getSourceBreakdown(8),
      activity: db.getRecentActivity(10),
      daily: db.getDailyRegistrations(7),
      colleges: db.getCollegeDistribution(8),
      topProjects: db.getTopProjects(6),
      leaderboard: db.getLeaderboard(10),
      events: db.getEventCounts(10),
      recent: db.getRecentEvents(25),
      generatedAt: new Date().toISOString(),
    });
  });

  api.get('/admin/messages', (_req, res) => {
    res.json({ items: db.listMessages(200), counts: db.messageCounts() });
  });

  api.patch('/admin/messages/:id', (req, res) => {
    const status = str(req.body?.status, 10);
    if (!['new', 'read'].includes(status)) {
      return badRequest(res, 'status_invalid', "Status must be 'new' or 'read'.");
    }
    const updated = db.setMessageStatus(Number(req.params.id), status);
    if (!updated) return res.status(404).json({ error: 'not_found', detail: 'Unknown message.' });
    res.json({ item: updated, counts: db.messageCounts() });
  });

  api.delete('/admin/messages/:id', (req, res) => {
    const removed = db.deleteMessage(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'not_found', detail: 'Unknown message.' });
    res.json({ removed: true, counts: db.messageCounts() });
  });

  api.get('/admin/reminders', (_req, res) => {
    res.json({ items: db.listReminders(200), counts: db.reminderCounts() });
  });

  api.patch('/admin/reminders/:id', (req, res) => {
    const status = str(req.body?.status, 12);
    if (!['new', 'reminded'].includes(status)) {
      return badRequest(res, 'status_invalid', "Status must be 'new' or 'reminded'.");
    }
    const updated = db.setReminderStatus(Number(req.params.id), status);
    if (!updated) return res.status(404).json({ error: 'not_found', detail: 'Unknown reminder.' });
    res.json({ item: updated, counts: db.reminderCounts() });
  });

  api.delete('/admin/reminders/:id', (req, res) => {
    const removed = db.deleteReminder(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'not_found', detail: 'Unknown reminder.' });
    res.json({ removed: true, counts: db.reminderCounts() });
  });

  /* --------------------------------------------------- student tools ── */
  const requireDevice = (req, res, next) => {
    const id = str(req.params.deviceId ?? req.query.deviceId ?? req.body?.deviceId, 64);
    if (!id) return badRequest(res, 'device_required', 'A device id is required.');
    req.deviceId = id;
    next();
  };

  // Vault
  api.get('/vault/:deviceId', requireDevice, (req, res) => {
    res.json({ ideas: db.getVault(req.deviceId) });
  });

  api.post('/vault', requireDevice, (req, res) => {
    const projectId = str(req.body?.projectId, 60);
    if (!projectId) return badRequest(res, 'project_required', 'A project id is required.');
    const idea = db.upsertVaultIdea({
      deviceId: req.deviceId,
      studentCode: str(req.body?.studentCode, 24) || null,
      projectId,
      title: str(req.body?.title, 120),
      pitch: str(req.body?.pitch, 300),
      note: str(req.body?.note, 600),
      priority: str(req.body?.priority, 12) || 'next',
      starred: !!req.body?.starred,
      stages: Array.isArray(req.body?.stages) ? req.body.stages.slice(0, 20) : [],
    });
    res.json({ idea: { ...idea, starred: !!idea.starred, stages: JSON.parse(idea.stages) } });
  });

  api.delete('/vault/:deviceId/:projectId', requireDevice, (req, res) => {
    const removed = db.deleteVaultIdea(req.deviceId, str(req.params.projectId, 60));
    res.json({ removed });
  });

  // Quiz
  api.get('/quiz/:deviceId', requireDevice, (req, res) => {
    res.json({ result: db.getQuiz(req.deviceId) });
  });

  api.post('/quiz', requireDevice, (req, res) => {
    const score = Number(req.body?.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return badRequest(res, 'score_invalid', 'Score must be between 0 and 100.');
    }
    res.json({
      result: db.saveQuiz({
        deviceId: req.deviceId,
        studentCode: str(req.body?.studentCode, 24) || null,
        score: Math.round(score),
        band: str(req.body?.band, 20) || 'starter',
        answers: Array.isArray(req.body?.answers) ? req.body.answers : [],
      }),
    });
  });

  // Prompts
  api.get('/prompts/:deviceId', requireDevice, (req, res) => {
    res.json({ prompts: db.getPrompts(req.deviceId) });
  });

  api.post('/prompts', requireDevice, (req, res) => {
    const body = str(req.body?.body, 8000);
    if (!body) return badRequest(res, 'body_required', 'Nothing to save.');
    res.json(
      db.savePrompt({
        deviceId: req.deviceId,
        studentCode: str(req.body?.studentCode, 24) || null,
        projectId: str(req.body?.projectId, 60),
        output: str(req.body?.output, 20),
        body,
      }),
    );
  });

  /* ------------------------------------------------------------- 404 */
  api.use((_req, res) => res.status(404).json({ error: 'unknown_endpoint' }));

  return api;
}

function shapeStudent(s) {
  return {
    code: s.code,
    source: s.source ?? 'direct',
    name: s.name,
    email: s.email,
    college: s.college,
    branch: s.branch,
    year: s.year,
    experience: s.experience,
    interest: s.interest,
    projectId: s.project_id,
    seat: s.seat,
    createdAt: s.created_at,
  };
}
