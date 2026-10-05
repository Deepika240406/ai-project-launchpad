import { PROJECTS, projectById } from '../data/projects';
import { rankProjects, recommendProject, type Recommendation } from './recommend';
import type { Experience, InterestId, ProblemArea, Project } from './types';

/**
 * Thin façade over the recommender so UI code never re-implements matching logic.
 * Two entry points, because the app asks two different questions:
 *   - suggestForInterest()  -> registration flow (interest + experience, maybe locked)
 *   - suggestForSimulator() -> simulator flow (interest + experience + problem)
 */

export function suggestForInterest(
  interest: InterestId | null,
  experience: Experience | null,
  lockedProjectId?: string,
): Project {
  if (lockedProjectId) {
    const locked = projectById(lockedProjectId);
    if (locked) return locked;
  }
  return recommendProject({
    interest: interest ?? undefined,
    experience: experience ?? undefined,
    seed: interest ? interest.length : 2,
  }).project;
}

export function suggestForSimulator(input: {
  interest: InterestId;
  experience: Experience;
  problem: ProblemArea;
}): Recommendation {
  return recommendProject(input);
}

export function alternateOptions(input: {
  interest?: InterestId;
  experience?: Experience;
  problem?: ProblemArea;
  excludeId?: string;
  limit?: number;
}): Project[] {
  const ranked = rankProjects(
    { interest: input.interest, experience: input.experience, problem: input.problem },
    (input.limit ?? 3) + 1,
  );
  return ranked.map((r) => r.project).filter((p) => p.id !== input.excludeId).slice(0, input.limit ?? 3);
}

/** Every project, cheapest-first for the "browse all" rail. */
export const projectsByEase = [...PROJECTS].sort((a, b) => {
  const order = { Beginner: 0, 'Beginner+': 1, Intermediate: 2 } as const;
  return order[a.difficulty] - order[b.difficulty];
});
