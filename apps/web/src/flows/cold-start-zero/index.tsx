import type { FlowDefinition } from '../flow-definition';

export const coldStartZeroFlow: FlowDefinition = {
  id: 'clarification',
  matches: { responseType: 'clarification' },
  phase: 'cold-0',
  inputPlaceholderKey: 'coldStartZero.pasteHint',
};
