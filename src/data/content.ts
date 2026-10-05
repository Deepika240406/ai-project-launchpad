import type { Experience, InterestId, ProblemArea } from '../lib/types';

/* ==========================================================================
   PRODUCT CONTENT — the words and rules the product is made of.
   ---------------------------------------------------------------------------
   This file used to hold demo data as well. It does not any more: every number
   the site shows now comes from the campaign database (or is a product rule,
   like the 500-seat cap or the milestone thresholds below). Nothing here is
   fictional activity.
   ========================================================================== */

/** The seat cap — a product rule, not a campaign result. */
export const REGISTRATION_TARGET = 500;

/**
 * Fallback workshop date, used only when the server catalogue cannot be read.
 * The server's WORKSHOP_DATE env var is the source of truth; this default must
 * match server/catalogue.mjs so an offline page still tells the truth.
 */
export const DEFAULT_WORKSHOP_DATE = '2026-11-07T18:00:00+05:30';

export const SIMULATOR_PROBLEMS: { id: ProblemArea; label: string; emoji: string }[] = [
  { id: 'career', label: 'Getting a job / internship', emoji: '💼' },
  { id: 'productivity', label: 'Saving time every day', emoji: '⚡' },
  { id: 'campus', label: 'Something on campus', emoji: '🏫' },
  { id: 'money', label: 'Managing money', emoji: '💰' },
  { id: 'content', label: 'Creating content', emoji: '🎬' },
  { id: 'health', label: 'Health & fitness', emoji: '🫀' },
];

export const EXPERIENCE_OPTIONS: {
  id: Experience;
  label: string;
  emoji: string;
  blurb: string;
}[] = [
  { id: 'Beginner', label: 'Beginner', emoji: '🟢', blurb: 'Barely written code. That is fine.' },
  {
    id: 'Intermediate',
    label: 'Intermediate',
    emoji: '🟡',
    blurb: 'Can build a basic app or script.',
  },
  { id: 'Advanced', label: 'Advanced', emoji: '🔴', blurb: 'DSA / projects / internships done.' },
];

export const BRANCHES = [
  'CSE',
  'IT',
  'AI & DS',
  'ECE',
  'EEE',
  'Mechanical',
  'Civil',
  'Other',
];

export const YEARS = ['Final year (2026)', 'Final year (2027)', 'Third year', 'Other'];

export const INTEREST_IDS: InterestId[] = ['ai-ml', 'web', 'automation', 'data', 'security', 'unsure'];

export const FAQ = [
  {
    q: 'I have never built anything with AI. Is that a problem?',
    a: 'No — it is the actual target audience. The workshop assumes zero AI experience. If you can follow along in a browser, you can finish this.',
  },
  {
    q: 'Do I need to know Python already?',
    a: 'You need to have seen it once. We give you the full code for your project — your job is to follow the workflow, run it, and understand what each part does.',
  },
  {
    q: 'What if I do not finish in 60 minutes?',
    a: 'You will leave with a complete working codebase either way. The session includes a "finish it later" path, plus a 48-hour support thread.',
  },
  {
    q: 'Is it really free? What is the catch?',
    a: 'It is free. NxtWave runs it as a top-of-funnel workshop. You are not asked for payment at any point during registration.',
  },
  {
    q: 'Do I need a laptop?',
    a: 'Yes, a laptop with internet. Everything runs in the browser + a free API tier. No GPU, no paid tools.',
  },
  {
    q: 'Will this count as my final-year project?',
    a: 'You can absolutely use it as your starting point. It is scoped as a portfolio-grade prototype — you extend it into a full final-year project after the workshop.',
  },
  {
    q: 'How does the referral reward work?',
    a: 'Every registrant gets a referral link. 1 friend unlocks the project source code & starter kit, 3 unlock the verified certificate and LinkedIn badge, and 5 unlock a 1-on-1 resume audit with a mentor. Nobody is being asked to sell anything.',
  },
];

export const OUTCOMES = [
  { title: 'One working AI prototype', detail: 'Running on your machine and deployed to a public link.' },
  { title: 'A project idea you own', detail: 'Matched to your interests, not handed out from a list.' },
  { title: 'AI development experience', detail: 'You will have called a real AI API and shaped its output.' },
  { title: 'A GitHub-ready project', detail: 'Structured repo with a README you can send to recruiters.' },
  { title: 'One interview talking point', detail: 'A concrete, defensible answer to "tell me about your project".' },
];

export const PAIN_POINTS = [
  {
    title: 'Final year, and still no idea what to build',
    detail: 'Everyone asks. Nobody has given you a starting point that fits your level.',
  },
  {
    title: 'Projects on the resume you are not proud of',
    detail: 'The CRUD clone from semester 5 is not going to impress a placement panel.',
  },
  {
    title: 'AI feels like it is for other people',
    detail: 'It looks like maths, papers and GPUs — not something you can touch in one evening.',
  },
  {
    title: 'Watching tutorials, shipping nothing',
    detail: 'You have 40 hours of playlists and an empty GitHub. The gap is not knowledge, it is a deadline.',
  },
];

export const ROADMAP = [
  { time: '00–10', title: 'Choose your idea', detail: 'You pick from a matched set — no blank-page problem.' },
  { time: '10–20', title: 'Understand the AI workflow', detail: 'Input → prompt → model → structured output. The mental model that lasts.' },
  { time: '20–40', title: 'Build the core functionality', detail: 'Interface, state, data. The part that makes it yours.' },
  { time: '40–50', title: 'Connect AI', detail: 'Wire the API, handle the response, guard the failures.' },
  { time: '50–60', title: 'Deploy + showcase', detail: 'Ship a public link and write your 3-line project pitch.' },
];

/**
 * COHORT STRETCH GOALS — honest collective unlocks.
 * The thresholds and rewards are product rules; the progress meter under them
 * is the real registration count. Nothing here is faked: an unlock lights up
 * only when the database actually crosses the number.
 */
export const STRETCH_GOALS: {
  at: number;
  emoji: string;
  title: string;
  detail: string;
}[] = [
  {
    at: 100,
    emoji: '🧠',
    title: 'The AI Prompt Pack',
    detail: 'Every registered student gets the battle-tested prompt library we build with in the session.',
  },
  {
    at: 250,
    emoji: '🎤',
    title: 'Live Q&A + resume roast hour',
    detail: 'A bonus session where we review project resumes live. Free for the whole cohort.',
  },
  {
    at: 500,
    emoji: '🏆',
    title: 'Builder Wall + workshop recordings',
    detail: 'Full session recordings, and every project goes on the permanent Builder Wall.',
  },
];

/** Referral reward rules. Thresholds and rewards are product rules. */
export const MILESTONES = [
  {
    count: 1,
    label: 'AI Project Source Code & Starter Kit',
    detail: 'Instant access to the complete GitHub repo — pre-configured and ready to build on.',
    icon: 'Code2',
  },
  {
    count: 3,
    label: 'Verified Certificate & LinkedIn Badge',
    detail: 'Fast-tracked NxtWave Verified Completion Certificate to showcase on LinkedIn and your placement resume.',
    icon: 'BadgeCheck',
  },
  {
    count: 5,
    label: 'Resume Audit & Mock Interview',
    detail: 'A 1-on-1 session with an NxtWave AI mentor to sharpen your resume and rehearse the placement interview.',
    icon: 'UserCheck',
  },
];
