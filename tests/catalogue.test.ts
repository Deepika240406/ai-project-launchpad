import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  EXPERIENCE,
  INTERESTS,
  LEGACY_EXPERIENCE,
  LEGACY_INTERESTS,
  LEGACY_PROJECT_IDS,
  LEGACY_SOURCES,
  PROJECT_IDS,
  SOURCES,
  YEARS,
  normalizeExperience,
  normalizeInterest,
  normalizeProjectId,
  normalizeSource,
  normalizeYear,
} from '../server/catalogue.mjs';

import { PROJECTS, INTERESTS as CLIENT_INTERESTS } from '../src/data/projects';
import { EXPERIENCE_OPTIONS, YEARS as CLIENT_YEARS } from '../src/data/content';

/**
 * CATALOGUE CONTRACTS
 * ---------------------------------------------------------------------------
 * The server keeps its own copy of the project and interest lists because it is
 * plain ESM and must run without a build step — it cannot import the client's
 * TypeScript. The cost of two copies is real: an earlier revision of this code
 * had the client posting `resume-analyzer` while the server only accepted
 * `ai-resume-analyzer`, so `project_id` was written as NULL for every genuine
 * registration and the "top projects" chart was measured off a population that
 * had quietly excluded the entire live campaign.
 *
 * That failure is invisible in a screenshot, so it gets a test instead: these
 * assert the two copies agree, that the aliases resolve, and that the migration
 * which renamed the old rows actually ran.
 */

const ROOT = resolve(__dirname, '..');

/**
 * Migrations in `db.mjs` are lazy: they run the first time a connection is
 * needed, not at import. So the test has to actually touch the database, and
 * `countStudents()` is exactly the call `GET /api/health` makes — the same
 * sequence a real server restart performs.
 */
const BOOT_AND_TOUCH_DB =
  "import('./server/db.mjs').then((m) => { m.countStudents(); process.exit(0); })";

describe('catalogue: one id space across client and server', () => {
  it('agrees on the project slugs', () => {
    expect([...PROJECT_IDS].sort()).toEqual(PROJECTS.map((p) => p.id).sort());
  });

  it('agrees on the interests', () => {
    expect([...INTERESTS].sort()).toEqual(CLIENT_INTERESTS.map((i) => i.id).sort());
  });

  it('agrees on the experience levels', () => {
    expect([...EXPERIENCE].sort()).toEqual(
      EXPERIENCE_OPTIONS.map((e) => e.id.toLowerCase()).sort(),
    );
  });

  it('accepts every year label the wizard can send', () => {
    // The server allows a superset (it also accepts the seeded numeric phrasing),
    // but it must never reject a value the wizard offers — that is the direction
    // that loses data.
    for (const year of CLIENT_YEARS) {
      expect(YEARS).toContain(year);
      expect(normalizeYear(year)).toBe(year);
    }
  });

  it('keeps every legacy alias pointing at a real, canonical slug', () => {
    for (const [from, to] of Object.entries(LEGACY_PROJECT_IDS)) {
      expect(PROJECT_IDS).toContain(to);
      expect(PROJECT_IDS).not.toContain(from);
    }
    for (const to of Object.values(LEGACY_INTERESTS)) expect(INTERESTS).toContain(to);
    for (const to of Object.values(LEGACY_EXPERIENCE)) expect(EXPERIENCE).toContain(to);
  });
});

describe('catalogue: the normalisers', () => {
  it('rewrites a legacy project slug instead of dropping it', () => {
    expect(normalizeProjectId('ai-resume-analyzer')).toBe('resume-analyzer');
    expect(normalizeProjectId('ai-interview-coach')).toBe('interview-coach');
    expect(normalizeProjectId('notes-summarizer')).toBe('notes-generator');
    expect(normalizeProjectId('attendance-helper')).toBe('attendance-system');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(normalizeProjectId('  Resume-Analyzer ')).toBe('resume-analyzer');
    expect(normalizeInterest('SECURITY')).toBe('security');
    expect(normalizeExperience('Intermediate')).toBe('intermediate');
    expect(normalizeYear('third year')).toBe('Third year');
  });

  it('returns null for an unknown value rather than guessing', () => {
    expect(normalizeProjectId('blockchain-nft-minter')).toBeNull();
    expect(normalizeProjectId('')).toBeNull();
    expect(normalizeProjectId(undefined)).toBeNull();
    expect(normalizeInterest('gaming')).toBeNull();
    expect(normalizeExperience('god-tier')).toBeNull();
    expect(normalizeYear('someday')).toBeNull();
  });
});

describe('catalogue: channel attribution', () => {
  it('accepts the spelling the seed and the share links use', () => {
    // The regression: the seed wrote `clubs`, the API accepted only `club`, and
    // every campus-club registration was filed as "direct" — the campaign's
    // second-largest channel, missing from its own dashboard.
    expect(normalizeSource('clubs')).toBe('clubs');
    expect(normalizeSource('club')).toBe('clubs');
    expect(normalizeSource('college-group')).toBe('clubs');
    expect(normalizeSource('WhatsApp')).toBe('whatsapp');
    expect(normalizeSource('whatsapp-group')).toBe('whatsapp');
  });

  it('collapses an unplanned channel onto the closest planned one', () => {
    expect(normalizeSource('qr')).toBe('clubs'); // a canteen poster is a club effort
    expect(normalizeSource('instagram')).toBe('direct'); // organic social, per the plan
    expect(normalizeSource('organic')).toBe('direct');
  });

  it('every alias resolves to a channel the dashboard actually shows', () => {
    for (const to of Object.values(LEGACY_SOURCES)) expect(SOURCES).toContain(to);
  });

  it('leaves an unknown tag unattributed rather than guessing a channel', () => {
    expect(normalizeSource('billboard')).toBeNull();
    expect(normalizeSource('')).toBeNull();
    expect(normalizeSource(undefined)).toBeNull();
  });
});

describe('migration v3: an existing database is renamed in place', () => {
  let dir: string;
  let file: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'apl-migrate-'));
    file = join(dir, 'legacy.db');

    /**
     * Build a database exactly as the *original* version of this code would have
     * left it: schema v1 — the server's old slugs, no `source` column, no
     * indexes. It declares version 1, which is the honest claim: a file that
     * says it is already at v2 would never be given v2's own changes.
     * The upgrade path has to bring this file forward without losing a row.
     */
    const old = new Database(file);
    old.exec(`
      CREATE TABLE students (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        code          TEXT    NOT NULL UNIQUE,
        name          TEXT    NOT NULL,
        email         TEXT    NOT NULL UNIQUE,
        college       TEXT,
        branch        TEXT,
        year          TEXT,
        experience    TEXT,
        interest      TEXT,
        project_id    TEXT,
        referred_by   TEXT,
        seat          INTEGER NOT NULL,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO students (code, name, email, year, experience, interest, project_id, seat)
      VALUES ('MEERA58', 'Meera S', 'meera@example.com', '3rd year', 'some', 'cyber', 'ai-resume-analyzer', 1),
             ('VIKRAM11', 'Vikram T', 'vikram@example.com', '2nd year', 'confident', 'web', 'attendance-helper', 2),
             ('SANA94', 'Sana K', 'sana@example.com', 'Final year (2026)', 'Beginner', 'security', 'resume-analyzer', 3);
      PRAGMA user_version = 1;
    `);
    old.close();

    // Importing db.mjs is what runs the migrations — the same path a server
    // restart takes, which is the point: this is not a test-only code path.
    execFileSync('node', ['-e', BOOT_AND_TOUCH_DB], {
      cwd: ROOT,
      env: { ...process.env, DB_PATH: file },
      stdio: 'pipe',
    });
  });

  afterAll(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  it('brings a v1 database all the way to the current version', () => {
    const d = new Database(file, { readonly: true });
    expect(d.pragma('user_version', { simple: true })).toBe(5);
    // v4/v5 give the replies inbox and remind-me leads their tables — created
    // in place, not by a reset.
    const tables = d
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[];
    d.close();
    expect(tables.map((t) => t.name)).toContain('messages');
    expect(tables.map((t) => t.name)).toContain('reminders');
  });

  it('rewrites the legacy slugs onto the canonical ones', () => {
    const d = new Database(file, { readonly: true });
    const rows = d
      .prepare('SELECT code, project_id, interest, experience, year FROM students ORDER BY seat')
      .all() as {
      code: string;
      project_id: string;
      interest: string;
      experience: string;
      year: string;
    }[];
    d.close();

    expect(rows.map((r) => r.project_id)).toEqual([
      'resume-analyzer',
      'attendance-system',
      'resume-analyzer', // already canonical — must be left exactly as it was
    ]);
    expect(rows.map((r) => r.interest)).toEqual(['security', 'web', 'security']);
    expect(rows.map((r) => r.experience)).toEqual(['intermediate', 'advanced', 'beginner']);
    expect(rows.map((r) => r.year)).toEqual(['3rd year', '2nd year', 'Final year (2026)']);
  });

  it('loses no rows and adds the attribution column', () => {
    const d = new Database(file, { readonly: true });
    const { n } = d.prepare('SELECT COUNT(*) AS n FROM students').get() as { n: number };
    const cols = d.prepare('PRAGMA table_info(students)').all() as { name: string }[];
    d.close();

    expect(n).toBe(3);
    expect(cols.map((c) => c.name)).toContain('source');
  });

  it('is safe to run twice — a second boot changes nothing', () => {
    const before = new Database(file, { readonly: true });
    const snapshot = before.prepare('SELECT * FROM students ORDER BY seat').all();
    before.close();

    execFileSync('node', ['-e', BOOT_AND_TOUCH_DB], {
      cwd: ROOT,
      env: { ...process.env, DB_PATH: file },
      stdio: 'pipe',
    });

    const after = new Database(file, { readonly: true });
    const again = after.prepare('SELECT * FROM students ORDER BY seat').all();
    const version = after.pragma('user_version', { simple: true });
    after.close();

    expect(again).toEqual(snapshot);
    expect(version).toBe(5);
  });
});
