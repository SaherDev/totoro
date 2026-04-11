import { z } from 'zod';
import type { RecallResponseData } from '@totoro/shared';
import type { FlowDefinition } from '../flow-definition';
import type { HomeStoreApi } from '@/store/home-store';
import { RecallResults } from './RecallResults';
import { recallFixture } from './recall.fixtures';

const RecallResponseDataSchema = z.object({
  results: z.array(
    z.object({
      place_id: z.string(),
      place_name: z.string(),
      address: z.string(),
      cuisine: z.string().nullable(),
      price_range: z.string().nullable(),
      source_url: z.string().nullable(),
      saved_at: z.string(),
      match_reason: z.string(),
      thumbnail_url: z.string().optional(),
    })
  ),
  total: z.number(),
  has_more: z.boolean(),
});

export const recallFlow: FlowDefinition<RecallResponseData> = {
  id: 'recall',
  matches: { clientIntent: 'recall', responseType: 'recall' },
  phase: 'recall',
  inputPlaceholderKey: 'recall.placeholder',
  schema: RecallResponseDataSchema,
  fixture: recallFixture,
  onResponse: (res, store: HomeStoreApi) => {
    if (res.type === 'recall' && res.data) {
      const data = res.data as RecallResponseData;
      store.setRecallResults?.(data.results, data.has_more);
    }
  },
  Component: ({ store }) => (
    <RecallResults
      results={store.recallResults || []}
      hasMore={store.recallHasMore}
      breadcrumb={store.recallBreadcrumb}
      onModeOverride={() => {
        // Switch from recall to consult (recommendation mode)
        // This will be implemented in Phase 8
      }}
    />
  ),
};
