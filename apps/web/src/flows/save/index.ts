import type { FlowDefinition } from '../flow-definition';

export const saveFlow: FlowDefinition = {
  id: 'save',
  matches: { clientIntent: 'save', responseType: 'extract-place' },
  phase: 'thinking',
  inputPlaceholderKey: 'home.suggestions.save',
};
