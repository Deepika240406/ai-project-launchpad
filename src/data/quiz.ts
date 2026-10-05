import type { InterestId, ProblemArea } from '../lib/types';

/**
 * AI PROJECT READINESS CHECK
 * ---------------------------------------------------------------------------
 * Five questions, deliberately not a personality quiz. Each answer is a real
 * piece of information the workshop needs to place a student:
 *   1. coding comfort        → which project difficulty they get
 *   2. where they are stuck  → which trigger the follow-up uses
 *   3. time they can give    → whether the 60-minute promise is honest for them
 *   4. what they want out of it → which project family to recommend
 *   5. what they have built  → whether we pitch "your first project" or
 *                              "your best project"
 *
 * Scoring is additive and bounded 0–100, so the score is explainable to the
 * student rather than a black box (the same reason the recommender is a rule
 * engine, not an LLM call).
 */

export interface QuizOption {
  id: string;
  label: string;
  detail?: string;
  points: number;
  /** Optional routing signals used to build the recommendation. */
  interest?: InterestId;
  problem?: ProblemArea;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  helper: string;
  options: QuizOption[];
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'coding',
    prompt: 'How comfortable are you with code right now?',
    helper: 'There is no wrong answer — this decides your project difficulty, not your eligibility.',
    options: [
      { id: 'none', label: 'I have barely written any', detail: 'That is the actual target audience', points: 8 },
      { id: 'basic', label: 'I can write basic Python or Java', detail: 'Loops, functions, a little OOP', points: 16 },
      { id: 'projects', label: 'I have built small projects', detail: 'CLI tools, simple web apps', points: 22 },
      { id: 'strong', label: 'I am confident with a framework', detail: 'React, Flask, or similar', points: 25 },
    ],
  },
  {
    id: 'blocker',
    prompt: 'What stops you from building an AI project today?',
    helper: 'Most students are stuck on exactly one of these. Naming it is half the fix.',
    options: [
      { id: 'idea', label: 'I do not know what to build', points: 8 },
      { id: 'tools', label: 'I do not know which tools or APIs to use', points: 14 },
      { id: 'finish', label: 'I start things and never finish them', points: 10 },
      { id: 'confidence', label: 'I worry my project will look too basic', points: 16 },
    ],
  },
  {
    id: 'time',
    prompt: 'How much time can you give this in the next 7 days?',
    helper: 'The session is one hour. We ask so the follow-up plan is realistic, not aspirational.',
    options: [
      { id: 'hour', label: 'About an hour — that is my limit', points: 12 },
      { id: 'few', label: 'A few hours, spread out', points: 20 },
      { id: 'weekend', label: 'A full weekend if it is worth it', points: 25 },
      { id: 'unsure', label: 'I am not sure yet', points: 10 },
    ],
  },
  {
    id: 'goal',
    prompt: 'What do you want out of it?',
    helper: 'This decides which project family we match you to.',
    options: [
      { id: 'placement', label: 'Something to put on my resume for placements', points: 22, interest: 'ai-ml', problem: 'career' },
      { id: 'marks', label: 'A head start on my final-year project', points: 20, interest: 'data', problem: 'campus' },
      { id: 'skills', label: 'To genuinely learn how AI apps are built', points: 22, interest: 'ai-ml', problem: 'productivity' },
      { id: 'shipping', label: 'To finally ship something of my own', points: 22, interest: 'web', problem: 'productivity' },
    ],
  },
  {
    id: 'built',
    prompt: 'Have you used an AI API before?',
    helper: 'A yes just changes how we pitch the hour — it does not change whether you should join.',
    options: [
      { id: 'no', label: 'No, never', points: 14, interest: 'ai-ml' },
      { id: 'chatted', label: 'Only through ChatGPT-style chat', points: 18 },
      { id: 'yes', label: 'Yes, I have called one in code', points: 24, interest: 'automation' },
      { id: 'shipped', label: 'Yes, and I have deployed something with it', points: 26, interest: 'web' },
    ],
  },
];

export const MAX_SCORE = QUIZ.reduce(
  (total, q) => total + Math.max(...q.options.map((o) => o.points)),
  0,
);

export interface Band {
  id: 'starter' | 'ready' | 'strong';
  label: string;
  headline: string;
  body: string;
  /** What to do differently, given the band. */
  advice: string[];
}

export const BANDS: Band[] = [
  {
    id: 'starter',
    label: 'Starter',
    headline: 'Beginner friendly was written for you.',
    body: 'You are exactly who the 60-minute format is designed around: no prior AI, no framework, no finished portfolio. The session gives you the code — your job is to understand it and shape it.',
    advice: [
      'Pick a Beginner-difficulty project. Do not stretch for Intermediate in the first hour.',
      'Use the Prompt Lab to write your build prompt before the session — arriving with it halves the work.',
      'Do the "scope it in one sentence" stage first. Unbounded projects are what break beginners.',
    ],
  },
  {
    id: 'ready',
    label: 'Ready',
    headline: 'You can skip the hand-holding.',
    body: 'You have the basics. The value for you is the workflow — how an AI feature is actually structured in a working app — plus a deployed artefact you can point at.',
    advice: [
      'Take a Beginner+ project and add one feature of your own during the hour.',
      'Focus on the "wire the AI call" stage: error handling and output validation is where your code gets stronger.',
      'Use the extra time to write the README properly. That is what recruiters actually read.',
    ],
  },
  {
    id: 'strong',
    label: 'Advanced',
    headline: 'Use the hour to close, not to learn.',
    body: 'You can build. What you probably do not have is a finished, deployed, pitchable AI project with a clean write-up. That is the gap this hour closes.',
    advice: [
      'Take an Intermediate project and swap the model or the data source.',
      'Spend the last 10 minutes on the pitch, not the feature. A defended project beats a slightly bigger one.',
      'Consider bringing a friend — you are a strong referral source, and the Starter Kit unlocks at three.',
    ],
  },
];

export const bandFor = (score: number): Band =>
  score >= Math.round(MAX_SCORE * 0.72) ? BANDS[2] : score >= Math.round(MAX_SCORE * 0.45) ? BANDS[1] : BANDS[0];
