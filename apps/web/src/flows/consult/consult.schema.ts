import { z } from 'zod';
import type { ConsultResponseData } from '@totoro/shared';

const ConsultPlaceSchema = z.object({
  place_name: z.string(),
  address: z.string(),
  reasoning: z.string(),
  source: z.enum(['saved', 'discovered']),
  photos: z
    .object({
      hero: z.string().optional(),
      square: z.string().optional(),
    })
    .optional(),
});

const ReasoningStepSchema = z.object({
  step: z.string(),
  summary: z.string(),
});

export const ConsultResponseDataSchema = z.object({
  primary: ConsultPlaceSchema,
  alternatives: z.array(ConsultPlaceSchema),
  reasoning_steps: z.array(ReasoningStepSchema),
  context_chips: z.array(z.string()).optional(),
}) satisfies z.ZodType<ConsultResponseData>;
