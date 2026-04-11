export interface ConsultStep {
  key: string;
  i18nKey: string;
}

export const FLOW_2_STEPS: ConsultStep[] = [
  { key: 'intent_parsing', i18nKey: 'consult.steps.intent_parsing' },
  { key: 'retrieval',      i18nKey: 'consult.steps.retrieval' },
  { key: 'discovery',      i18nKey: 'consult.steps.discovery' },
  { key: 'validation',     i18nKey: 'consult.steps.validation' },
  { key: 'ranking',        i18nKey: 'consult.steps.ranking' },
  { key: 'completion',     i18nKey: 'consult.steps.completion' },
];

/** Millisecond offsets at which each step begins animating in */
export const STEP_OFFSETS: number[] = [0, 700, 1500, 2300, 3000, 3700];

/** Duration (ms) for each step's entry animation */
export const STEP_DURATIONS: number[] = [600, 700, 700, 600, 600, 400];

/** Total animation runtime — result card never reveals before this */
export const ANIMATION_COMPLETE_MS = 4100;

/** Skeleton placeholder card fades in at this offset */
export const SKELETON_APPEARS_MS = 2200;
