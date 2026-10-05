/**
 * REFERENCE DATA (server side)
 * ---------------------------------------------------------------------------
 * The API validates against these lists so a malformed or hostile request cannot
 * write `project_id: "'; DROP TABLE"`, an interest nobody offers, or a year that
 * would not survive a GROUP BY.
 *
 * ONE ID SPACE, DELIBERATELY.
 * These slug lists are the *same* slugs the client uses (`src/data/projects.ts`,
 * `src/data/demo.ts`) — the ones a student sees on their project card and in
 * their saved-ideas vault. They used to differ, and the cost was silent: the
 * wizard posted `resume-analyzer`, the server only accepted `ai-resume-analyzer`,
 * so the field was stored as NULL and "top projects" was measured off a
 * population that excluded every real registrant. `tests/catalogue.test.ts`
 * now asserts the two files agree, so drift fails the suite instead of losing
 * data quietly.
 *
 * Two copies of the lists is still a deliberate trade: shipping TypeScript into
 * the server would drag a build step into a runtime that otherwise needs none,
 * and the surface is ten ids and a handful of enums.
 *
 * LEGACY aliases are kept so a cached page or an older client still lands on the
 * right project instead of being nulled — and so migration v3 can rewrite the
 * rows the seed wrote with the older slugs.
 */

/** Canonical project slugs — identical to `PROJECTS[].id` on the client. */
export const PROJECT_IDS = [
  'resume-analyzer',
  'interview-coach',
  'expense-tracker',
  'study-buddy',
  'campus-assistant',
  'content-generator',
  'notes-generator',
  'attendance-system',
  'job-copilot',
  'phishing-detector',
];

/**
 * Slugs that used to be written by the seed and by an earlier client build.
 * Values are the canonical slug each one means. Anything not in this map and not
 * in PROJECT_IDS is rejected as unknown (stored as NULL, never guessed).
 */
export const LEGACY_PROJECT_IDS = {
  'ai-resume-analyzer': 'resume-analyzer',
  'ai-interview-coach': 'interview-coach',
  'notes-summarizer': 'notes-generator',
  'attendance-helper': 'attendance-system',
  // The two projects that existed only on the server side. Mapped to the closest
  // canonical project rather than dropped: 19 synthetic seed rows would
  // otherwise disappear from the project chart entirely.
  'placement-tracker': 'job-copilot',
  'email-assistant': 'content-generator',
};

/** Interests — identical to `INTERESTS[].id` on the client. */
export const INTERESTS = ['ai-ml', 'web', 'automation', 'data', 'security', 'unsure'];

/** `cyber` was the server's own spelling of the cybersecurity interest. */
export const LEGACY_INTERESTS = { cyber: 'security' };

/**
 * Experience levels, stored lower-case. The client's `Experience` type uses the
 * same three words title-cased for display.
 */
export const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];

/** `some` / `confident` were the seed's words for the middle and top bands. */
export const LEGACY_EXPERIENCE = { some: 'intermediate', confident: 'advanced' };

/**
 * Years.
 *
 * A union of the wizard's labels (`src/data/demo.ts` YEARS) and the numeric
 * phrasing the seed wrote. The wizard's labels are what new registrations store;
 * the numeric ones are accepted because rewriting 347 rows into a label that
 * claims a different year would be inventing data, which is worse than two
 * phrasings of a descriptive field. Nothing aggregates on year.
 */
export const YEARS = [
  'Final year (2026)',
  'Final year (2027)',
  'Third year',
  'Other',
  '1st year',
  '2nd year',
  '3rd year',
  '4th year',
];

/**
 * CHANNELS — where a registration actually came from.
 *
 * These are the six lines the growth plan measures plus the referral loop, which
 * is set by the server from `referred_by` and never by the client. Anything a
 * visitor can supply through `?src=` (or a UTM tag) is collapsed onto one of
 * them by `LEGACY_SOURCES`, because a channel the campaign does not run as its
 * own line — a canteen QR poster, an Instagram story — belongs to the effort
 * that produced it, not to a seventh category nobody plans against.
 *
 * The collapse is a documented judgement, not an accident: `clubs` was once the
 * only spelling the seed and the share links used while the API accepted only
 * `club`, so every campus-club registration was silently filed as "direct" —
 * the campaign's second-largest channel, invisible on its own dashboard.
 */
/**
 * The real workshop datetime (ISO, IST). Counting down to an honest, explicit
 * date is not scarcity theatre — the date is printed next to the countdown.
 * Override with the WORKSHOP_DATE env var when the cohort moves.
 */
export const WORKSHOP_DATE = process.env.WORKSHOP_DATE ?? '2026-11-07T18:00:00+05:30';

export const SOURCES = ['whatsapp', 'clubs', 'referral', 'email', 'linkedin', 'direct'];

/** Every spelling a client, a share link or a QR poster might send. */
export const LEGACY_SOURCES = {
  club: 'clubs',
  college: 'clubs',
  campus: 'clubs',
  'college-group': 'clubs',
  qr: 'clubs',
  'whatsapp-group': 'whatsapp',
  'whatsapp-status': 'whatsapp',
  wa: 'whatsapp',
  insta: 'direct',
  instagram: 'direct',
  organic: 'direct',
  'word-of-mouth': 'referral',
  invite: 'referral',
};

/** Resolve an attribution tag onto a measured channel, else null. */
export function normalizeSource(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (SOURCES.includes(v)) return v;
  return LEGACY_SOURCES[v] ?? null;
}

/* ────────────────────────────────────────────────────────── normalisers ── */

/**
 * Match case-insensitively and return the *canonical* casing, so `cse` and `CSE`
 * cannot become two different colleges in a GROUP BY.
 */
export function matchCanonical(value, allowed) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  return allowed.find((a) => a.toLowerCase() === v) ?? null;
}

/** Resolve a project slug, accepting a legacy alias, else null. */
export function normalizeProjectId(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (PROJECT_IDS.includes(v)) return v;
  return LEGACY_PROJECT_IDS[v] ?? null;
}

/** Resolve an interest id, accepting a legacy alias, else null. */
export function normalizeInterest(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (INTERESTS.includes(v)) return v;
  return LEGACY_INTERESTS[v] ?? null;
}

/** Resolve an experience level, accepting a legacy alias, else null. */
export function normalizeExperience(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (EXPERIENCE.includes(v)) return v;
  return LEGACY_EXPERIENCE[v] ?? null;
}

/** Resolve a year label, preserving the canonical spelling. */
export function normalizeYear(value) {
  return matchCanonical(value, YEARS);
}

/**
 * The shared rule for every optional field above: a value we do not recognise
 * becomes `null`, never a 400. A student who picks "Not sure yet" and sends a
 * string we later rename should still get a seat — rejecting them would trade a
 * real registration for a schema purity the campaign does not need. Name and
 * email are still validated strictly, because a registration we cannot contact
 * is not a registration.
 */

/** Free text is trimmed and capped; anything else would be stored verbatim. */
export const cleanText = (value, max = 120) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
