import { z } from 'zod';
import type { RecallResponseData } from '@totoro/shared';
import type { FlowDefinition } from '../flow-definition';
import type { HomeStoreApi } from '@/store/home-store';
import { PlaceObjectSchema } from '../../lib/place-schema';
import { recallFixture } from './recall.fixtures';

const RecallResultSchema = z.object({
  place: PlaceObjectSchema,
  match_reason: z.enum(['filter', 'semantic', 'keyword', 'semantic + keyword']),
  relevance_score: z.number().nullable(),
  score_type: z.enum(['rrf', 'ts_rank']).nullable(),
});

export const RecallResponseDataSchema = z.object({
  results: z.array(RecallResultSchema),
  total_count: z.number(),
  empty_state: z.boolean(),
}) satisfies z.ZodType<RecallResponseData>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic flow type
export const recallFlow: FlowDefinition<any> = {
  id: 'recall',
  matches: { clientIntent: 'recall', responseType: 'recall' },
  phase: 'thinking',
  inputPlaceholderKey: 'recall.placeholder',
  schema: RecallResponseDataSchema,
  fixture: recallFixture,
  onResponse: (res, store: HomeStoreApi) => {
    if (res.type === 'recall' && res.data) {
      const parsed = RecallResponseDataSchema.safeParse(res.data);
      if (!parsed.success) {
        store.pushMessage(res.message || "I couldn't find anything matching that in your saved places.");
        return;
      }
      const data = parsed.data;
      if (data.empty_state) {
        store.pushMessage(res.message || "You haven't saved any places yet.");
        return;
      }
      if (data.results.length > 0) {
        store.pushRecallResults(res.message || 'Found in your saves', data);
      } else {
        store.pushMessage(res.message || "I couldn't find anything matching that in your saved places.");
      }
    }
  },
  Component: () => null,
};
