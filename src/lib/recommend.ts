import { PROJECTS, projectById } from '../data/projects';
import type { Experience, InterestId, ProblemArea, Project } from './types';

/**
 * Recommendation engine.
 *
 * Deliberately rule-based and deterministic rather than "an LLM call":
 *  - it runs instantly, offline, and identically for every student (no API key, no cost)
 *  - the reasoning is *explainable*, which is the whole point of showing it to the student
 *  - an LLM adds nothing here except latency and a bill
 *
 * In production this stays the first pass; an LLM is only worth adding later to
 * re-word the `reasons[]` copy, not to choose the project.
 */

export interface RecommendInput {
  interest?: InterestId;
  experience?: Experience;
  problem?: ProblemArea;
  /** Rotates the tie-break so "Generate" feels alive without ever being random-nonsense. */
  seed?: number;
}

export interface Recommendation {
  project: Project;
  score: number;
  reasons: string[];
}

const EXPERIENCE_ORDER: Experience[] = ['Beginner', 'Intermediate', 'Advanced'];

function scoreProject(p: Project, input: RecommendInput, seed: number): number {
  let score = 40;

  // Interest is the strongest signal we collect.
  if (input.interest) {
    if (input.interest === 'unsure') {
      // "Not sure yet" should bias hard toward the safest possible first build.
      score += p.difficulty === 'Beginner' ? 22 : p.difficulty === 'Beginner+' ? 6 : -18;
    } else if (p.interests.includes(input.interest)) {
      score += 50;
    } else {
      score -= 22;
    }
  }

  // The problem they named out loud matters more than the label they picked.
  if (input.problem) {
    score += p.problems.includes(input.problem) ? 34 : -10;
  }

  // Experience fit: never hand an Intermediate build to a true beginner as the *only* option.
  if (input.experience) {
    const target = EXPERIENCE_ORDER.indexOf(p.experienceFloor);
    const have = EXPERIENCE_ORDER.indexOf(input.experience);
    score += target === have ? 16 : target < have ? 9 : -34;
  }

  // Deterministic jitter: keeps repeat clicks varied while staying explainable.
  score += ((seed * 37 + p.id.length * 11) % 17) - 8;

  return score;
}

function buildReasons(p: Project, input: RecommendInput): string[] {
  const reasons: string[] = [];

  if (input.interest && input.interest !== 'unsure' && p.interests.includes(input.interest)) {
    reasons.push('It matches the area you said you want to work in.');
  }
  if (input.interest === 'unsure') {
    reasons.push('You said you are not sure yet — so you get the safest possible first build.');
  }
  if (input.problem && p.problems.includes(input.problem)) {
    reasons.push('It solves a problem you told us you actually care about.');
  }
  if (input.experience === 'Beginner' && p.difficulty === 'Beginner') {
    reasons.push('No prior coding experience assumed. You copy, you run, you understand.');
  } else if (input.experience === 'Intermediate' && p.difficulty !== 'Beginner') {
    reasons.push('It stretches you one level past what you already know — useful, not brutal.');
  } else if (input.experience === 'Advanced') {
    reasons.push('There is headroom here: swap the model, add auth, push the scope further.');
  }
  reasons.push(`Everything runs locally and deploys free — ${p.tech.join(' + ')}.`);

  return reasons.slice(0, 4);
}

export function recommendProject(input: RecommendInput = {}): Recommendation {
  const seed = input.seed ?? 0;
  const ranked = PROJECTS.map((p) => ({ p, score: scoreProject(p, input, seed) })).sort(
    (a, b) => b.score - a.score,
  );
  const winner = ranked[0].p;
  return { project: winner, score: ranked[0].score, reasons: buildReasons(winner, input) };
}

/** Ranked list, used by the "see other matches" rail in the simulator result. */
export function rankProjects(input: RecommendInput, limit = 3): Recommendation[] {
  return PROJECTS.map((p) => ({ p, score: scoreProject(p, input, input.seed ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p, score }) => ({ project: p, score, reasons: buildReasons(p, input) }));
}

/** Small utility the simulator uses to keep project references type-safe. */
export const safeProject = (id: string): Project => projectById(id) ?? PROJECTS[0];
