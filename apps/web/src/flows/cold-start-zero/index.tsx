import { z } from 'zod';
import type { FlowDefinition } from '../flow-definition';
import { ColdStartZero } from './ColdStartZero';

export const coldStartZeroFlow: FlowDefinition = {
  id: 'clarification', // Maps to phase 'cold-0' via home page logic
  matches: { responseType: 'clarification' },
  phase: 'cold-0',
  inputPlaceholderKey: 'coldStartZero.pasteHint',
  schema: z.unknown(),
  fixture: async () => ({ type: 'clarification', message: '', data: null }),
  onResponse: () => {
    // Cold-start flows are not triggered by responses; they're phase-based
  },
  Component: ({ store }) => <ColdStartZero onSuggestionClick={store.submit} />,
};
