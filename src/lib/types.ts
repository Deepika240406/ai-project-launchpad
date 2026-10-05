/**
 * Shared domain types for the AI Project Launchpad prototype.
 * Kept in one place so the mock analytics layer, the referral engine and the
 * (future) Supabase adapter all speak the same vocabulary.
 */

export type InterestId =
  | 'ai-ml'
  | 'web'
  | 'automation'
  | 'data'
  | 'security'
  | 'unsure';

export type ProblemArea =
  | 'career'
  | 'productivity'
  | 'money'
  | 'health'
  | 'campus'
  | 'content';

export type Experience = 'Beginner' | 'Intermediate' | 'Advanced';

export type Difficulty = 'Beginner' | 'Beginner+' | 'Intermediate';

export interface Project {
  id: string;
  name: string;
  tagline: string;
  /** One-paragraph pitch shown in the detail sheet. */
  description: string;
  difficulty: Difficulty;
  tech: string[];
  buildTime: string;
  learn: string[];
  /** The single sentence a student can repeat in an interview. */
  interviewLine: string;
  /** Which interests / problem areas this project maps onto — drives the recommender. */
  interests: InterestId[];
  problems: ProblemArea[];
  experienceFloor: Experience;
  accent: string;
  icon: string;
}

export interface Referral {
  id: string;
  /** First name only — what the referred student is comfortable being shown. */
  name: string;
  college: string;
  joinedAt: number;
}

export interface RegisteredStudent {
  name: string;
  email: string;
  college: string;
  /** Enrichment — present on the full match flow, often absent on a quick join. */
  branch?: string;
  year?: string;
  experience?: Experience;
  interest?: InterestId;
  recommendedProjectId?: string;
  code: string;
  joinedAt: number;
}

export interface CampaignEvent {
  id: string;
  name: string;
  props?: Record<string, unknown>;
  at: number;
}

export interface LeaderboardBuilder {
  id: string;
  name: string;
  college: string;
  referrals: number;
  /**
   * Set only when the server supplied the position. Without a live answer the
   * ranking is computed locally from whatever rows exist, which is why it is
   * optional rather than assumed.
   */
  rank?: number;
}

export interface RankedBuilder extends LeaderboardBuilder {
  rank: number;
  isYou: boolean;
}

/* ---------------------------------------------------------------------------
   WORKSPACE TYPES
   Everything a student creates for themselves in the prototype: a vault of
   candidate ideas, a 6-stage build checklist, and the project card they share.
   --------------------------------------------------------------------------- */

export interface BuildStage {
  id: string;
  label: string;
  detail: string;
}

export interface VaultIdea {
  id: string;
  title: string;
  /** One-line pitch, editable. */
  pitch: string;
  /** Free-form notes the student writes for themselves. */
  notes: string;
  /** '' | 'now' | 'next' | 'later' — a lightweight priority, not a score. */
  priority: 'now' | 'next' | 'later' | '';
  /** Catalogued project this was created from, if any. */
  projectId?: string;
  createdAt: number;
  /** Checklist stage ids the student has completed for this idea. */
  stages: string[];
}

export interface QuizAnswer {
  questionId: string;
  optionId: string;
  points: number;
}

export interface QuizResult {
  score: number;
  band: 'starter' | 'ready' | 'strong';
  answers: QuizAnswer[];
  completedAt: number;
}
