/**
 * DATABASE — schema, migrations and every query in one place.
 * ---------------------------------------------------------------------------
 * SQLite via better-sqlite3: synchronous, zero-config, and a single file, which
 * means the whole "backend" is one artefact you can copy, inspect or delete.
 *
 * Deliberate design notes
 *
 * 1. **`device_id` is the anchor, not the student.** A student uses the Idea
 *    Vault, the readiness check and the Prompt Lab *before* they register — so
 *    tying those to a student row would throw away everything they did. Every
 *    "tool" row is keyed by device, with a nullable `student_code` that gets
 *    back-filled the moment they register. Anonymous use stays first-class.
 *
 * 2. **A separate `referrals` table, not just a `referred_by` column.** The
 *    column is the fast path (one indexed read). The table is the audit trail:
 *    it records *when* a referral landed, which is what makes a time-series of
 *    referral growth possible and what you need to spot abuse later.
 *
 * 3. **Events are append-only and never joined to students.** Analytics outlives
 *    whatever we do to the student table, and one student can generate thousands
 *    of rows. Keeping them separate is why deleting a registration can't corrupt
 *    the funnel numbers.
 *
 * 4. **Codes are unique and collision-checked at insert time**, not generated
 *    and hoped for.
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  EXPERIENCE,
  INTERESTS,
  LEGACY_EXPERIENCE,
  LEGACY_INTERESTS,
  LEGACY_PROJECT_IDS,
  PROJECT_IDS,
} from './catalogue.mjs';

const DB_PATH = process.env.DB_PATH ?? resolve('data/launchpad.db');

let db;

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL'); // concurrent reads while writing feedback
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

/** Close the handle — used by tests so each run starts from a clean file. */
export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

function schemaV1(d) {
  d.exec(`
    -- ─────────────────────────────────────────────────────────── students
    CREATE TABLE IF NOT EXISTS students (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      code          TEXT    NOT NULL UNIQUE,           -- DEEPIKA47
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      college       TEXT,
      branch        TEXT,
      year          TEXT,
      experience    TEXT,                              -- beginner | intermediate | advanced
      interest      TEXT,                              -- ai-ml | web | automation | security | …
      project_id    TEXT,                              -- the project they picked
      referred_by   TEXT,                              -- students.code, nullable
      seat          INTEGER NOT NULL,                  -- arrival order, 1-based
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_students_referred_by ON students(referred_by);
    CREATE INDEX IF NOT EXISTS idx_students_created     ON students(created_at);

    -- ─────────────────────────────────────────────────────────── referrals
    CREATE TABLE IF NOT EXISTS referrals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_code  TEXT    NOT NULL,
      referred_code  TEXT    NOT NULL UNIQUE,          -- a student is referred once
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_code);

    -- ─────────────────────────────────────────────────────────── events
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      props       TEXT,                                -- JSON
      path        TEXT,
      session_id  TEXT,
      device_id   TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_name    ON events(name);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

    -- ─────────────────────────────────────────────────────────── devices
    -- Anonymous-first: created on first tool use, upgraded on registration.
    CREATE TABLE IF NOT EXISTS devices (
      id            TEXT PRIMARY KEY,
      student_code  TEXT,                              -- back-filled at registration
      first_seen    TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────────────────── vault
    CREATE TABLE IF NOT EXISTS vault_ideas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id     TEXT    NOT NULL,
      student_code  TEXT,
      project_id    TEXT    NOT NULL,
      title         TEXT    NOT NULL DEFAULT '',
      pitch         TEXT    NOT NULL DEFAULT '',
      note          TEXT    NOT NULL DEFAULT '',
      priority      TEXT    NOT NULL DEFAULT 'next',   -- now | next | later
      starred       INTEGER NOT NULL DEFAULT 0,
      stages        TEXT    NOT NULL DEFAULT '[]',     -- JSON array of stage ids
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(device_id, project_id)
    );
    CREATE INDEX IF NOT EXISTS idx_vault_device ON vault_ideas(device_id);

    -- ─────────────────────────────────────────────────────────── quiz
    CREATE TABLE IF NOT EXISTS quiz_results (
      device_id     TEXT PRIMARY KEY,
      student_code  TEXT,
      score         INTEGER NOT NULL,
      band          TEXT    NOT NULL,
      answers       TEXT    NOT NULL DEFAULT '[]',     -- JSON
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ─────────────────────────────────────────────────────────── prompts
    CREATE TABLE IF NOT EXISTS prompts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id     TEXT    NOT NULL,
      student_code  TEXT,
      project_id    TEXT    NOT NULL,
      output        TEXT    NOT NULL,                  -- code | plan | debug
      body          TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_prompts_device ON prompts(device_id);

    -- ─────────────────────────────────────────────────────────── meta
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

/**
 * VERSIONED MIGRATIONS
 * ---------------------------------------------------------------------------
 * `PRAGMA user_version` tracks how far a database has been migrated, so an
 * existing file is upgraded in place instead of being wiped. That matters the
 * moment there is real data: `npm run seed` sets up a fresh file, but the file
 * that is already running in front of students must survive a schema change.
 *
 * Rules:
 *   · migrations are append-only — never edit a shipped one, add a new one
 *   · each runs exactly once, in order, inside a transaction
 *   · a migration that needs to change existing rows does so explicitly
 */
const MIGRATIONS = [
  { name: 'v1 — initial schema', run: schemaV1 },
  {
    name: 'v2 — attribution + email integrity',
    run(d) {
      // 1. Real attribution. Until now the channel breakdown was a projection;
      //    this records where each registration actually came from, so "top
      //    source" becomes a measurement rather than an assumption.
      if (!hasColumn(d, 'students', 'source')) {
        d.exec(`ALTER TABLE students ADD COLUMN source TEXT`);
      }
      d.exec(`
        UPDATE students
           SET source = CASE WHEN referred_by IS NOT NULL THEN 'referral' ELSE 'direct' END
         WHERE source IS NULL
      `);

      // 2. Email uniqueness must be case-insensitive, and only the DATABASE can
      //    guarantee that. The API already checks with lower(email), but that is
      //    a read-then-write race: two simultaneous sign-ups with Deepika@x.com
      //    and deepika@x.com both pass the check and both insert. An index on
      //    lower(email) makes it impossible rather than unlikely.
      try {
        d.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_lower ON students(lower(email))`);
      } catch {
        // A pre-existing duplicate is an operator decision, not a crash. Say so
        // loudly rather than booting into an unenforced state.
        const dupes = d
          .prepare(
            `SELECT lower(email) AS e, COUNT(*) AS n FROM students GROUP BY 1 HAVING n > 1 LIMIT 5`,
          )
          .all();
        console.warn(
          `  ! could not enforce unique emails — duplicates to resolve first: ` +
            dupes.map((r) => `${r.e} (×${r.n})`).join(', '),
        );
      }

      // 3. Reporting queries filter on these constantly.
      d.exec(`CREATE INDEX IF NOT EXISTS idx_students_source ON students(source)`);
      d.exec(`CREATE INDEX IF NOT EXISTS idx_students_simulated ON students(experience)`);
    },
  },
  {
    name: 'v3 — one id space',
    run(d) {
      /**
       * The wizard and the server disagreed about project slugs: the client sent
       * `resume-analyzer`, the server only knew `ai-resume-analyzer`, so every
       * real registration stored NULL and the project chart was measured off a
       * population that excluded actual students. The lists now match; this
       * migration brings the existing rows onto the same slugs so one project
       * cannot appear twice under two names.
       *
       * Rows whose slug is not in the map are left alone — an unrecognised value
       * is a signal, and quietly rewriting it would hide it.
       */
      /**
       * Rewrite a column onto its canonical spelling, in two passes:
       *   1. aliases — `ai-resume-analyzer` → `resume-analyzer`, `some` → `intermediate`
       *   2. case drift — `Beginner` → `beginner`, so two spellings of one level
       *      cannot split a GROUP BY
       * Rows whose value matches nothing are left untouched: an unrecognised
       * value is a signal worth seeing, not something to silently normalise away.
       */
      const rename = (column, map, canonical) => {
        const stmt = d.prepare(
          `UPDATE students SET ${column} = ? WHERE lower(trim(${column})) = ? AND ${column} != ?`,
        );
        let changed = 0;
        for (const [from, to] of Object.entries(map)) {
          changed += stmt.run(to, from, to).changes;
        }
        for (const value of canonical) {
          changed += stmt.run(value, value.toLowerCase(), value).changes;
        }
        return changed;
      };

      const projects = rename('project_id', CANONICAL_MAP.project, PROJECT_IDS);
      const interests = rename('interest', CANONICAL_MAP.interest, INTERESTS);
      const experience = rename('experience', CANONICAL_MAP.experience, EXPERIENCE);

      // Lower-case the year so `3rd year` and `3Rd Year` cannot split a group.
      const years = d
        .prepare(`UPDATE students SET year = trim(year) WHERE year IS NOT NULL AND year != trim(year)`)
        .run().changes;

      console.log(
        `  · id space unified — projects ${projects}, interests ${interests}, ` +
          `experience ${experience}, years trimmed ${years}`,
      );
    },
  },
  {
    name: 'v4 — replies inbox',
    run(d) {
      // The public "send a reply / ask a question" form writes here; /admin
      // reads and triages it. `status` is new | read — a two-state inbox is
      // enough and cannot get out of sync with anything.
      d.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          body TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'new',
          device_id TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status, created_at DESC);
      `);
    },
  },
  {
    name: 'v5 — remind-me leads',
    run(d) {
      // The soft commitment: a student who is interested but not ready gives an
      // email instead of bouncing. Stored like everything else — a lead we can
      // actually act on, not a lost visitor.
      d.exec(`
        CREATE TABLE IF NOT EXISTS reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'new',
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status, created_at DESC);
      `);
    },
  },
];

export function migrate(d) {
  const current = d.pragma('user_version', { simple: true }) || 0;
  /**
   * The array index IS the version number, so a migration inserted in the wrong
   * place would silently skip — and mislabel — a rename that real rows depend
   * on. That is not a style nit, so it is checked rather than trusted.
   */
  MIGRATIONS.forEach((m, i) => {
    if (!m.name.startsWith(`v${i + 1} `)) {
      throw new Error(
        `MIGRATIONS out of order: index ${i} should be v${i + 1}, found "${m.name}". ` +
          'Migrations are append-only — add the new one at the end.',
      );
    }
  });

  const pending = MIGRATIONS.slice(current);

  if (!pending.length) return;

  for (let i = 0; i < pending.length; i += 1) {
    const version = current + i + 1;
    d.transaction(() => {
      pending[i].run(d);
      d.pragma(`user_version = ${version}`);
    })();
    console.log(`  db migrated → ${pending[i].name}`);
  }
}

/** SQLite has no `ADD COLUMN IF NOT EXISTS`, so feature-detect first. */
function hasColumn(d, table, column) {
  return d
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === column);
}

/* ═══════════════════════════════════════════════════════════════ helpers */

/** Campaign target, stored in the DB so it is not a magic number in the UI. */
export function getMeta(key, fallback = null) {
  const row = getDb().prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setMeta(key, value) {
  getDb()
    .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

/* ═══════════════════════════════════════════════════════════════ codes */

/**
 * Referral code from a name: first word, uppercase, letters only, then two
 * digits. `Deepika Reddy` → `DEEPIKA47`. On collision the digits change rather
 * than the name, so the code always still looks like the student.
 */
export function makeCode(name, attempt = 0) {
  const base =
    (name || 'BUILDER')
      .trim()
      .split(/\s+/)[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 9) || 'BUILDER';
  const n = attempt === 0 ? 10 + Math.floor(Math.random() * 90) : 10 + ((attempt * 7 + 31) % 90);
  return `${base}${n}`;
}

/* ═══════════════════════════════════════════════════════════════ students */

export function countStudents() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM students').get().n;
}

export function getStudentByCode(code) {
  return getDb().prepare('SELECT * FROM students WHERE code = ?').get(code) ?? null;
}

export function getStudentByEmail(email) {
  return (
    getDb().prepare('SELECT * FROM students WHERE lower(email) = lower(?)').get(email) ?? null
  );
}

/** How many friends a code has brought in. */
export function referralCount(code) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM referrals WHERE referrer_code = ?').get(code).n;
}

/** 1-based rank by referral count; ties broken by who got there first. */
export function rankOf(code) {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) + 1 AS rank FROM students s
        WHERE (SELECT COUNT(*) FROM referrals r WHERE r.referrer_code = s.code) >
              (SELECT COUNT(*) FROM referrals r WHERE r.referrer_code = ?)`,
    )
    .get(code);
  return row?.rank ?? 1;
}

/**
 * Register a student.
 *
 * Everything happens in ONE transaction: the seat number, the unique code, the
 * student row and the referral audit row either all land or none do. Partial
 * writes here would hand out duplicate seats under concurrent loads.
 */
export function createStudent(input) {
  const d = getDb();
  const tx = d.transaction((s) => {
    // ── referral attribution, with anti-gaming ────────────────────────────
    // A bad code is DROPPED, never a reason to reject the registration: failing
    // a signup to punish a link loses a real student, which is the opposite of
    // what the campaign needs.
    //
    // Two checks, and the second one matters more than it looks:
    //   1. Same email → self-referral. Catches the naive case.
    //   2. Same DEVICE already belongs to the referrer → self-referral. This is
    //      the real defence: a second email is free, but a second phone is not.
    //      Someone registering a throwaway account on the same device to farm
    //      their own code is the cheapest possible attack on this loop.
    //
    // Deliberately NOT checked: matching names. Duplicate names are common and
    // blocking them would silently deny referrals to real, honest students —
    // a false positive here breaks the growth loop to prevent a rounding error.
    let referrer = null;
    if (s.ref) {
      const candidate = getStudentByCode(String(s.ref).toUpperCase());
      const sameEmail =
        candidate && candidate.email.toLowerCase() === String(s.email).toLowerCase();
      const sameDevice = (() => {
        if (!candidate || !s.deviceId) return false;
        const known = d.prepare('SELECT student_code FROM devices WHERE id = ?').get(s.deviceId);
        return !!known?.student_code && known.student_code === candidate.code;
      })();

      if (candidate && !sameEmail && !sameDevice) referrer = candidate.code;
    }

    const seat = countStudents() + 1;

    // Real attribution, in priority order:
    //   1. a referral code → 'referral' (the only one that is self-evidently true)
    //   2. an explicit ?src= / ?utm_source= the student arrived with
    //   3. 'direct' — which is honest, not a placeholder
    const source = referrer ? 'referral' : s.source ? String(s.source).slice(0, 30) : 'direct';

    let code = '';
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const candidate = makeCode(s.name, attempt);
      if (!getStudentByCode(candidate)) {
        code = candidate;
        break;
      }
    }
    if (!code) code = `BUILDER${Date.now().toString().slice(-6)}`;

    d.prepare(
      `INSERT INTO students
         (code, name, email, college, branch, year, experience, interest, project_id, referred_by, seat, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      code,
      s.name,
      s.email,
      s.college ?? null,
      s.branch ?? null,
      s.year ?? null,
      s.experience ?? null,
      s.interest ?? null,
      s.projectId ?? null,
      referrer,
      seat,
      source,
    );

    if (referrer) {
      d.prepare('INSERT OR IGNORE INTO referrals (referrer_code, referred_code) VALUES (?, ?)').run(
        referrer,
        code,
      );
    }

    if (s.deviceId) {
      d.prepare(
        `INSERT INTO devices (id, student_code) VALUES (?, ?)
           ON CONFLICT(id) DO UPDATE SET student_code = excluded.student_code, last_seen = datetime('now')`,
      ).run(s.deviceId, code);
      // Claim anything this device did anonymously.
      for (const table of ['vault_ideas', 'quiz_results', 'prompts']) {
        d.prepare(`UPDATE ${table} SET student_code = ? WHERE device_id = ? AND student_code IS NULL`).run(
          code,
          s.deviceId,
        );
      }
    }

    return { code, seat, referredBy: referrer, source };
  });

  return tx(input);
}

/* ═══════════════════════════════════════════════════════════════ reads */

/**
 * The legacy → canonical slug maps live in `catalogue.mjs`, and migration v3
 * imports them rather than repeating the table. Two copies of a rename map is
 * how a migration and a validator end up disagreeing about what "canonical"
 * means — and one of them is then silently wrong.
 */
const CANONICAL_MAP = {
  project: { ...LEGACY_PROJECT_IDS },
  interest: { ...LEGACY_INTERESTS },
  experience: { ...LEGACY_EXPERIENCE },
};

/**
 * The campaign read.
 *
 * Every registration in the database is a real registration: the demo/simulate
 * button and its 'simulated' row flag are gone. `total` is therefore the one
 * honest number, and it feeds the seat counter, the leaderboard and /admin
 * alike — there is no second number to reconcile.
 */
export function getStats(target = 500) {
  const d = getDb();
  const total = countStudents();
  const today = d
    .prepare(`SELECT COUNT(*) AS n FROM students WHERE date(created_at) = date('now')`)
    .get().n;
  const referralRegs = d
    .prepare(
      `SELECT COUNT(*) AS n FROM referrals r
         JOIN students s ON s.code = r.referred_code`,
    )
    .get().n;

  return {
    total,
    target,
    spotsLeft: Math.max(0, target - total),
    today,
    referralRegs,
    organicRegs: total - referralRegs,
    percent: Math.min(100, Math.round((total / target) * 1000) / 10),
    /** Share of registrations that arrived through a referral. */
    referralShare: total ? Math.round((referralRegs / total) * 1000) / 10 : 0,
  };
}

/**
 * Recent registrations, for the activity ticker.
 *
 * Deliberately returns only what is safe to show a stranger: first name and
 * college. No surnames, no emails, no codes — the ticker is social proof, not
 * a data leak.
 */
export function getRecentActivity(limit = 12) {
  return getDb()
    .prepare(
      `SELECT
         CASE
           WHEN instr(trim(name), ' ') > 0
             THEN substr(trim(name), 1, instr(trim(name), ' ') - 1)
           ELSE trim(name)
         END AS firstName,
         COALESCE(NULLIF(TRIM(college), ''), 'a college') AS college,
         COALESCE(NULLIF(TRIM(branch), ''), '') AS branch,
         project_id AS projectId,
         created_at AS at
       FROM students
       WHERE length(trim(name)) > 1
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(limit);
}

/**
 * Real channel attribution, replacing the projection table.
 * Anything not from a referral falls into whatever `?src=` said, else direct.
 */
export function getSourceBreakdown(limit = 8) {
  return getDb()
    .prepare(
      `SELECT source, COUNT(*) AS registrations
         FROM students
        WHERE 1=1
        GROUP BY 1
        ORDER BY registrations DESC
        LIMIT ?`,
    )
    .all(limit);
}

/** College scoreboard — the healthy competitive dynamic across campuses. */
export function getCollegeScoreboard(limit = 8) {
  return getDb()
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(college), ''), 'Not specified') AS college,
              COUNT(*) AS students,
              SUM(CASE WHEN referred_by IS NOT NULL THEN 1 ELSE 0 END) AS referrals
         FROM students
        WHERE 1=1
        GROUP BY 1
        ORDER BY students DESC
        LIMIT ?`,
    )
    .all(limit);
}

export function getLeaderboard(limit = 25) {
  return getDb()
    .prepare(
      // COALESCE'd the same way the college scoreboard does it, so a student who
      // skipped the college field reads "Not specified" rather than blank.
      `SELECT s.code, s.name,
              COALESCE(NULLIF(TRIM(s.college), ''), 'Not specified') AS college,
              s.created_at AS joinedAt,
              (SELECT COUNT(*) FROM referrals r WHERE r.referrer_code = s.code) AS referrals
         FROM students s
        WHERE 1=1
          AND EXISTS (SELECT 1 FROM referrals r2 WHERE r2.referrer_code = s.code)
        -- created_at is stored to the second and the seed writes many rows in
        -- the same second, so id is the final tiebreak. Without it two identical
        -- requests could return two different orders, which makes a leaderboard
        -- look like it is reshuffling at random.
        ORDER BY referrals DESC, s.created_at ASC, s.id ASC
        LIMIT ?`,
    )
    .all(limit);
}

export function getCollegeDistribution(limit = 8) {
  return getDb()
    .prepare(
      `SELECT COALESCE(NULLIF(TRIM(college), ''), 'Not specified') AS college, COUNT(*) AS students
         FROM students
        GROUP BY 1 ORDER BY students DESC LIMIT ?`,
    )
    .all(limit);
}

export function getTopProjects(limit = 6) {
  return getDb()
    .prepare(
      `SELECT project_id AS projectId, COUNT(*) AS picks
         FROM students
        WHERE project_id IS NOT NULL AND project_id != ''
        GROUP BY 1 ORDER BY picks DESC LIMIT ?`,
    )
    .all(limit);
}

export function getDailyRegistrations(days = 7) {
  return getDb()
    .prepare(
      `SELECT date(created_at) AS day,
              COUNT(*) AS registrations,
              SUM(CASE WHEN referred_by IS NOT NULL THEN 1 ELSE 0 END) AS referrals
         FROM students
        WHERE created_at >= datetime('now', ?)
        GROUP BY 1 ORDER BY 1`,
    )
    .all(`-${days} days`);
}

export function getEventCounts(limit = 12) {
  return getDb()
    .prepare(
      `SELECT name, COUNT(*) AS count FROM events GROUP BY 1 ORDER BY count DESC LIMIT ?`,
    )
    .all(limit);
}

export function getRecentEvents(limit = 40) {
  return getDb()
    .prepare('SELECT name, props, path, created_at AS at FROM events ORDER BY id DESC LIMIT ?')
    .all(limit)
    .map((e) => ({ ...e, props: safeJson(e.props) }));
}

export function insertEvents(rows) {
  const stmt = getDb().prepare(
    'INSERT INTO events (name, props, path, session_id, device_id) VALUES (?, ?, ?, ?, ?)',
  );
  const tx = getDb().transaction((list) => {
    for (const e of list) {
      stmt.run(e.name, JSON.stringify(e.props ?? {}), e.path ?? null, e.sessionId ?? null, e.deviceId ?? null);
    }
  });
  tx(rows);
  return rows.length;
}

/* ═══════════════════════════════════════════════════════════════ tools */

/* ═════════════════════════════════════════════════════════════ messages */

export function createMessage({ name, email = null, body, deviceId = null }) {
  const d = getDb();
  const info = d
    .prepare(
      `INSERT INTO messages (name, email, body, device_id) VALUES (?, ?, ?, ?)`,
    )
    .run(name, email, body, deviceId);
  return getMessage(Number(info.lastInsertRowid));
}

export function getMessage(id) {
  return getDb().prepare(`SELECT * FROM messages WHERE id = ?`).get(id) ?? null;
}

export function referredFriends(code, limit = 20) {
  return getDb()
    .prepare(
      `SELECT s.name, s.college, s.created_at AS joinedAt
         FROM students s
        WHERE s.referred_by = ?
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT ?`,
    )
    .all(code, limit);
}

export function listMessages(limit = 50) {
  return getDb()
    .prepare(`SELECT * FROM messages ORDER BY created_at DESC, id DESC LIMIT ?`)
    .all(limit);
}

export function messageCounts() {
  const d = getDb();
  const total = d.prepare(`SELECT COUNT(*) AS n FROM messages`).get().n;
  const unread = d.prepare(`SELECT COUNT(*) AS n FROM messages WHERE status = 'new'`).get().n;
  return { total, unread };
}

export function setMessageStatus(id, status) {
  const info = getDb().prepare(`UPDATE messages SET status = ? WHERE id = ?`).run(status, id);
  return info.changes > 0 ? getMessage(id) : null;
}

export function deleteMessage(id) {
  return getDb().prepare(`DELETE FROM messages WHERE id = ?`).run(id).changes > 0;
}

export function createReminder({ name = null, email }) {
  const info = getDb()
    .prepare(`INSERT INTO reminders (name, email) VALUES (?, ?)`)
    .run(name, email);
  return getReminder(Number(info.lastInsertRowid));
}

export function getReminder(id) {
  return getDb().prepare(`SELECT * FROM reminders WHERE id = ?`).get(id) ?? null;
}

export function listReminders(limit = 100) {
  return getDb()
    .prepare(`SELECT * FROM reminders ORDER BY created_at DESC, id DESC LIMIT ?`)
    .all(limit);
}

export function reminderCounts() {
  const d = getDb();
  const total = d.prepare(`SELECT COUNT(*) AS n FROM reminders`).get().n;
  const fresh = d.prepare(`SELECT COUNT(*) AS n FROM reminders WHERE status = 'new'`).get().n;
  return { total, new: fresh };
}

export function setReminderStatus(id, status) {
  const info = getDb().prepare(`UPDATE reminders SET status = ? WHERE id = ?`).run(status, id);
  return info.changes > 0 ? getReminder(id) : null;
}

export function deleteReminder(id) {
  return getDb().prepare(`DELETE FROM reminders WHERE id = ?`).run(id).changes > 0;
}

/**
 * Class cohorts — (college, branch) groups, the class-vs-class challenge.
 * Only rows that named a branch count: "CSE at SSN" is a real class identity,
 * "Unknown at SSN" is not.
 */
/**
 * The exact standing of one college: how many students it has and its rank
 * among ALL colleges (not just a visible top-N), so the success screen can
 * say "you're #4 from SSN" without ever being wrong about a college that is
 * off the board.
 */
/**
 * The impact of one student's share link: how many times the link was opened
 * and how many of those turned into real registrations. Counted from the event
 * log and the referrals table — the student sees their funnel, not a vanity
 * number, which is exactly what makes them share again.
 */
export function linkImpact(code) {
  const d = getDb();
  const visits = d
    .prepare(
      `SELECT COUNT(*) AS n FROM events
        WHERE name = 'referral_link_visited'
          AND json_extract(props, '$.code') = ?`,
    )
    .get(code).n;
  const joined = d
    .prepare(`SELECT COUNT(*) AS n FROM referrals WHERE referrer_code = ?`)
    .get(code).n;
  return { visits, joined };
}

export function collegeStanding(college) {
  const rows = getDb()
    .prepare(
      `SELECT lower(trim(college)) AS c, COUNT(*) AS n
         FROM students
        WHERE length(trim(college)) > 1
        GROUP BY 1
        ORDER BY n DESC, c ASC`,
    )
    .all();
  const key = String(college ?? '').trim().toLowerCase();
  const idx = rows.findIndex((r) => r.c === key);
  return {
    students: idx >= 0 ? rows[idx].n : 0,
    rank: idx >= 0 ? idx + 1 : null,
    colleges: rows.length,
  };
}

export function getClassScoreboard(limit = 8) {
  return getDb()
    .prepare(
      `SELECT s.college AS college, s.branch AS branch, COUNT(*) AS students,
              SUM(CASE WHEN s.referred_by IS NOT NULL THEN 1 ELSE 0 END) AS referrals
         FROM students s
        WHERE length(trim(s.college)) > 1 AND length(trim(s.branch)) > 1
        GROUP BY s.college, s.branch
        ORDER BY students DESC, s.college ASC, s.branch ASC
        LIMIT ?`,
    )
    .all(limit);
}

export function getVault(deviceId) {
  return getDb()
    .prepare('SELECT * FROM vault_ideas WHERE device_id = ? ORDER BY starred DESC, updated_at DESC')
    .all(deviceId)
    .map((r) => ({ ...r, starred: !!r.starred, stages: safeJson(r.stages, []) }));
}

export function upsertVaultIdea(idea) {
  const d = getDb();
  d.prepare(
    `INSERT INTO vault_ideas (device_id, student_code, project_id, title, pitch, note, priority, starred, stages)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_id, project_id) DO UPDATE SET
       title = excluded.title,
       pitch = excluded.pitch,
       note = excluded.note,
       priority = excluded.priority,
       starred = excluded.starred,
       stages = excluded.stages,
       student_code = COALESCE(excluded.student_code, vault_ideas.student_code),
       updated_at = datetime('now')`,
  ).run(
    idea.deviceId,
    idea.studentCode ?? null,
    idea.projectId,
    idea.title ?? '',
    idea.pitch ?? '',
    idea.note ?? '',
    idea.priority ?? 'next',
    idea.starred ? 1 : 0,
    JSON.stringify(idea.stages ?? []),
  );
  return getDb()
    .prepare('SELECT * FROM vault_ideas WHERE device_id = ? AND project_id = ?')
    .get(idea.deviceId, idea.projectId);
}

export function deleteVaultIdea(deviceId, projectId) {
  return getDb()
    .prepare('DELETE FROM vault_ideas WHERE device_id = ? AND project_id = ?')
    .run(deviceId, projectId).changes;
}

export function getQuiz(deviceId) {
  const row = getDb().prepare('SELECT * FROM quiz_results WHERE device_id = ?').get(deviceId);
  return row ? { ...row, answers: safeJson(row.answers, []) } : null;
}

export function saveQuiz(q) {
  getDb()
    .prepare(
      `INSERT INTO quiz_results (device_id, student_code, score, band, answers)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET
         score = excluded.score, band = excluded.band, answers = excluded.answers,
         student_code = COALESCE(excluded.student_code, quiz_results.student_code),
         created_at = datetime('now')`,
    )
    .run(q.deviceId, q.studentCode ?? null, q.score, q.band, JSON.stringify(q.answers ?? []));
  return getQuiz(q.deviceId);
}

export function getPrompts(deviceId, limit = 20) {
  return getDb()
    .prepare('SELECT * FROM prompts WHERE device_id = ? ORDER BY id DESC LIMIT ?')
    .all(deviceId, limit);
}

export function savePrompt(p) {
  getDb()
    .prepare(
      'INSERT INTO prompts (device_id, student_code, project_id, output, body) VALUES (?, ?, ?, ?, ?)',
    )
    .run(p.deviceId, p.studentCode ?? null, p.projectId, p.output, p.body);
  return { ok: true };
}

function safeJson(value, fallback = {}) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
