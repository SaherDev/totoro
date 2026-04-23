import type { FlowDefinition } from '../flow-definition';

export const consultFlow: FlowDefinition = {
  id: 'consult',
  matches: { clientIntent: 'consult', responseType: 'consult' },
  phase: 'thinking',
  inputPlaceholderKey: 'consult.placeholder',
};
