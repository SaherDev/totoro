import type { FlowDefinition } from '../flow-definition';

export const recallFlow: FlowDefinition = {
  id: 'recall',
  matches: { clientIntent: 'recall', responseType: 'recall' },
  phase: 'thinking',
  inputPlaceholderKey: 'recall.placeholder',
};
