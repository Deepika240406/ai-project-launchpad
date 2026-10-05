/**
 * SEED — DEV FIXTURE ONLY. Writes fictional rows that the site presents as
 * real registrations.
 * ---------------------------------------------------------------------------
 * The production site starts at zero and counts only real people. This script
 * exists so the UI can still be exercised locally without clicking through 347
 * sign-ups. Because those rows are indistinguishable from real ones, the script
 * refuses to run unless you explicitly acknowledge that:
 *
 *   ALLOW_SEED=1 node server/seed.mjs            # add the fixture if missing
 *   ALLOW_SEED=1 node server/seed.mjs --reset    # wipe everything and re-seed
 *
 * Never run it against a database a real student can reach.
 */
import { getDb, getStats, setMeta, countStudents, getStudentByCode } from './db.mjs';

const TARGET = Number(process.env.CAMPAIGN_TARGET ?? 500);
const BASELINE = Number(process.env.SEED_STUDENTS ?? 347);
const RESET = process.argv.includes('--reset');

if (process.env.ALLOW_SEED !== '1') {
  console.error(
    '\n  Refusing to seed: these are FICTIONAL rows the site shows as real registrations.\n' +
      '  Re-run with ALLOW_SEED=1 if that is what you want (local demo only).\n',
  );
  process.exit(1);
}


const FIRST = ['Deepika', 'Arjun', 'Priya', 'Rahul', 'Sneha', 'Karthik', 'Ananya', 'Vikram', 'Meera', 'Aditya', 'Divya', 'Rohan', 'Nisha', 'Sanjay', 'Pooja', 'Aman', 'Kavya', 'Vishal', 'Riya', 'Nikhil', 'Ishita', 'Harsh', 'Tanvi', 'Manish', 'Shreya', 'Gaurav', 'Neha', 'Abhishek', 'Lakshmi', 'Farhan', 'Zoya', 'Imran'];
const LAST = ['Reddy', 'Sharma', 'Patel', 'Kumar', 'Iyer', 'Nair', 'Singh', 'Gupta', 'Menon', 'Rao', 'Verma', 'Joshi', 'Das', 'Bose', 'Khan', 'Pillai', 'Chauhan', 'Mehta', 'Desai', 'Kulkarni'];
const CITIES = ['Chennai', 'Hyderabad', 'Bangalore', 'Coimbatore', 'Vijayawada', 'Pune', 'Kochi', 'Warangal', 'Mysore', 'Visakhapatnam', 'Tirupati', 'Madurai'];
const COLLEGES = [
  'Sathyabama Institute of Science & Technology',
  'Vellore Institute of Technology',
  'SRM Institute of Science & Technology',
  'Anna University',
  'Chaitanya Bharathi Institute of Technology',
  'Vasavi College of Engineering',
  'PES University',
  'R.V. College of Engineering',
  'KLE Technological University',
  'Amrita Vishwa Vidyapeetham',
];
const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'Mechanical', 'AI & DS', 'Civil'];
/**
 * These lists must equal the ones the API validates against and the wizard
 * sends (`server/catalogue.mjs` ↔ `src/data/projects.ts`). An earlier version
 * of this file wrote the server's own slugs, which meant the seeded rows and
 * every real registration disagreed about what a project is called.
 */
const YEARS = ['Final year (2026)', 'Final year (2027)', 'Third year'];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];
const INTERESTS = ['ai-ml', 'web', 'automation', 'data', 'security', 'unsure'];
const PROJECT_IDS = [
  'resume-analyzer', 'interview-coach', 'expense-tracker', 'study-buddy',
  'campus-assistant', 'content-generator', 'notes-generator', 'attendance-system',
  'job-copilot', 'phishing-detector',
];
// Weighted so the distribution matches the story told in /strategy and /admin —
// a long tail of the specialist projects, not a flat ten-way split.
const PROJECT_WEIGHTS = [78, 64, 41, 37, 29, 24, 20, 16, 12, 9];

/**
 * CHANNEL ATTRIBUTION for the seeded rows.
 *
 * These rows exist so the funnel can be demonstrated before any real traffic, so
 * they carry the channel mix the growth plan predicts — as a *stored* value on
 * each row, not as a parallel demo array. That is the whole point: /admin reads
 * `GROUP BY source`, so a seeded row with no source would appear as one giant
 * "unattributed" slice and the panel would be measuring nothing.
 *
 * `referral` is not in this table: it is set from `referred_by`, so the referral
 * slice always equals the number of real referral links on the graph.
 */
const CHANNEL_WEIGHTS = [
  ['whatsapp', 45],
  ['clubs', 25],
  ['email', 13],
  ['linkedin', 9],
  ['direct', 8],
];

/** Deterministic channel pick for a seat, proportional to CHANNEL_WEIGHTS. */
function channelFor(seat) {
  const total = CHANNEL_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let roll = (seat * 13 + rand(7)) % total;
  for (const [source, weight] of CHANNEL_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return source;
  }
  return 'direct';
}

const pick = (arr, i) => arr[i % arr.length];
const rand = (n) => Math.floor(Math.random() * n);

function weightedProject(i) {
  const total = PROJECT_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = ((i * 37 + 11) % total) + 1;
  for (let k = 0; k < PROJECT_IDS.length; k += 1) {
    roll -= PROJECT_WEIGHTS[k];
    if (roll <= 0) return PROJECT_IDS[k];
  }
  return PROJECT_IDS[0];
}

export function seed() {
  const db = getDb();

  if (RESET) {
    db.exec(`
      DELETE FROM referrals; DELETE FROM students; DELETE FROM events;
      DELETE FROM vault_ideas; DELETE FROM quiz_results; DELETE FROM prompts; DELETE FROM devices;
      DELETE FROM sqlite_sequence;
    `);
    console.log('  wiped all tables');
  }

  const current = countStudents();
  if (current >= BASELINE) {
    console.log(`  already at ${current} students (baseline ${BASELINE}) — no seed needed`);
    return getStats(TARGET);
  }

  const need = BASELINE - current;

  // Seeds are spread across the last 7 days so the admin curve has a shape.
  const insert = db.prepare(
    `INSERT OR IGNORE INTO students
       (code, name, email, college, branch, year, experience, interest, project_id, referred_by, source, seat, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`,
  );
  const linkReferral = db.prepare(
    'INSERT OR IGNORE INTO referrals (referrer_code, referred_code, created_at) VALUES (?, ?, ?)',
  );

  const tx = db.transaction(() => {
    // Roughly 29% of registrations arrive through a referral — the loop working.
    const referralSeats = [];
    for (let i = 0; i < need; i += 1) {
      const seat = current + i + 1;
      const first = pick(FIRST, seat * 7 + rand(5));
      const last = pick(LAST, seat * 3 + rand(3));
      const name = `${first} ${last}`;
      const code = `${first.toUpperCase()}${100 + (seat % 900)}`;
      const daysAgo = -(6 - Math.floor((i / need) * 7));

      // After the first 40 seats there is a pool of existing students to refer.
      const viaReferral = i > 40 && i % 100 < 29 && referralSeats.length > 0;
      const referrer = viaReferral ? referralSeats[rand(referralSeats.length)] : null;

      insert.run(
        code,
        name,
        `${first.toLowerCase()}.${last.toLowerCase()}${seat}@seed.local`,
        pick(COLLEGES, seat * 5 + rand(4)),
        pick(BRANCHES, seat + rand(3)),
        pick(YEARS, seat + rand(2)),
        pick(EXPERIENCE, seat * 3 + rand(2)),
        pick(INTERESTS, seat + rand(5)),
        weightedProject(seat),
        referrer,
        // A referred row is always attributed to the referral loop, so the
        // channel breakdown can never disagree with the referral count.
        referrer ? 'referral' : channelFor(seat),
        seat,
        `${daysAgo} days`,
      );

      if (referrer) {
        linkReferral.run(referrer, code, `datetime('now')`);
      }
      // Anyone can be a referrer once they are in.
      if (i % 3 === 0) referralSeats.push(code);
    }
  });
  tx();

  db.exec(`
    INSERT INTO events (name, props, path, session_id, created_at)
    SELECT 'page_view', '{"seeded":true}', '/', 'seed', datetime('now', '-' || (n % 7) || ' days')
      FROM (WITH RECURSIVE c(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM c WHERE n < 1200) SELECT n FROM c);
  `);

  setMeta('campaign_target', TARGET);

  const stats = getStats(TARGET);
  console.log(`  seeded → ${stats.total} students, ${stats.referralRegs} referrals, ${stats.percent}% of ${TARGET}`);
  return stats;
}

// `node server/seed.mjs` runs it directly; importing it does not.
if (import.meta.url === `file://${process.argv[1]}`) {
  const s = seed();
  console.log(`  referral share: ${Math.round((s.referralRegs / Math.max(1, s.total)) * 100)}%`);
}

export { getStudentByCode };
