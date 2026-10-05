import type { BuildStage } from './types';

/**
 * The six stages every student moves through in the 60 minutes.
 * Kept in one place because the Idea Vault checklist, the Prompt Lab steps and
 * the Card Studio all reference the same journey.
 */
export const BUILD_STAGES: BuildStage[] = [
  {
    id: 'scope',
    label: 'Scope it in one sentence',
    detail: 'Finish this: "It takes ___ and gives back ___." If you cannot, the project is too big.',
  },
  {
    id: 'input',
    label: 'Decide the input',
    detail: 'Paste, upload, or type? Pick the simplest one. One input only.',
  },
  {
    id: 'output',
    label: 'Decide the output',
    detail: 'What does the screen show when it works? Sketch it in words before you code.',
  },
  {
    id: 'prompt',
    label: 'Write the AI prompt',
    detail: 'Role, task, format, constraints. The Prompt Lab generates your first draft.',
  },
  {
    id: 'wire',
    label: 'Wire the AI call',
    detail: 'Send the input, get the output, handle the error case. Nothing else.',
  },
  {
    id: 'deploy',
    label: 'Deploy and pitch it',
    detail: 'Public link + a 3-line README. Then it is a portfolio project, not an experiment.',
  },
];
