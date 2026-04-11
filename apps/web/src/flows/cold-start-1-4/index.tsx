import { z } from 'zod';
import type { FlowDefinition } from '../flow-definition';
import { ColdStartOneFour } from './ColdStartOneFour';

export const coldStartOneFourFlow: FlowDefinition = {
  id: 'clarification', // Maps to phase 'cold-1-4' via home page logic
  matches: { responseType: 'clarification' },
  phase: 'cold-1-4',
  inputPlaceholderKey: 'coldStartOneFour.pasteHint',
  schema: z.unknown(),
  fixture: async () => ({ type: 'clarification', message: '', data: null }),
  onResponse: () => {
    // Cold-start flows are not triggered by responses; they're phase-based
  },
  Component: ColdStartOneFour,
};
