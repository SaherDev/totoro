import { z } from 'zod';
import type { RecallResponseData } from '@totoro/shared';
import type { FlowDefinition } from '../flow-definition';
import type { HomeStoreApi } from '@/store/home-store';


import { recallFixture } from './recall.fixtures';

// Loose schema — normalization happens in onResponse
const RecallResponseDataSchema = z.object({
  results: z.array(z.record(z.string(), z.unknown())),
}).passthrough();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema is loose; normalization happens in onResponse
export const recallFlow: FlowDefinition<any> = {
  id: 'recall',
  matches: { clientIntent: 'recall', responseType: 'recall' },
  phase: 'thinking',
  inputPlaceholderKey: 'recall.placeholder',
  schema: RecallResponseDataSchema,
  fixture: recallFixture,
  onResponse: (res, store: HomeStoreApi) => {
    if (res.type === 'recall' && res.data) {
      const raw = res.data as Record<string, unknown>;
      const rawResults = (raw['results'] as Array<Record<string, unknown>>) ?? [];

      const data: RecallResponseData = {
        results: rawResults.map((r) => ({
          place_id: (r['place_id'] as string) ?? '',
          place_name: (r['place_name'] as string) ?? '',
          address: (r['address'] as string) ?? '',
          cuisine: (r['cuisine'] as string | null) ?? null,
          price_range: (r['price_range'] as string | null) ?? null,
          source_url: (r['source_url'] as string | null) ?? null,
          saved_at: (r['saved_at'] as string) ?? '',
          match_reason: (r['match_reason'] as string) ?? '',
          thumbnail_url: r['thumbnail_url'] as string | undefined,
        })),
        total: (raw['total'] as number) ?? rawResults.length,
        has_more: (raw['has_more'] as boolean) ?? false,
      };

      if (data.results.length > 0) {
        store.pushRecallResults(res.message || 'Found in your saves', data);
      } else {
        store.pushMessage(res.message || "I couldn't find anything matching that in your saved places.");
      }
    }
  },
  Component: () => null,
};
