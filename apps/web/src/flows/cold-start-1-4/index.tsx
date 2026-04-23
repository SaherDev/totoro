import type { FlowDefinition } from '../flow-definition';

export const coldStartOneFourFlow: FlowDefinition = {
  id: 'clarification',
  matches: { responseType: 'clarification' },
  phase: 'cold-1-4',
  inputPlaceholderKey: 'coldStartOneFour.pasteHint',
};
