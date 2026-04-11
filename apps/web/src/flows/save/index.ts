import type { ExtractPlaceData } from '@totoro/shared';
import type { FlowDefinition } from '../flow-definition';
import type { HomeStoreApi } from '@/store/home-store';
import { ExtractPlaceDataSchema } from './save.schema';
import { saveFixture } from './save.fixtures';
import { SaveFlow } from './SaveFlow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema is loose; normalization happens in onResponse
export const saveFlow: FlowDefinition<any> = {
  id: 'save',
  matches: { clientIntent: 'save', responseType: 'extract-place' },
  phase: 'save-sheet',
  inputPlaceholderKey: 'home.suggestions.save',
  schema: ExtractPlaceDataSchema,
  fixture: saveFixture,
  onResponse: (res, store: HomeStoreApi) => {
    if (res.type === 'extract-place' && res.data) {
      const rawData = res.data as Record<string, unknown>;

      // Normalize places — real API uses extraction_status, fixtures use status
      const rawPlaces = (rawData['places'] as Array<Record<string, unknown>>) ?? [];
      const places: ExtractPlaceData['places'] = rawPlaces.map((p) => ({
        // use external_id as fallback place_id (Google Places ID from real API)
        place_id: (p['place_id'] as string | null) ?? (p['external_id'] as string | null) ?? null,
        place_name: (p['place_name'] as string | null) ?? null,
        address: (p['address'] as string | null) ?? null,
        cuisine: (p['cuisine'] as string | null) ?? null,
        price_range: (p['price_range'] as string | null) ?? null,
        thumbnail_url: p['thumbnail_url'] as string | undefined,
        confidence: p['confidence'] as number | undefined,
        // map extraction_status → status if status not present
        status: (p['status'] as 'resolved' | 'duplicate' | 'unresolved' | undefined)
          ?? (p['extraction_status'] === 'below_threshold' ? 'unresolved' : undefined),
      }));

      const sourceUrl = (rawData['source_url'] as string | null) ?? null;

      // Determine if ALL places are high-confidence (≥ 0.7) and resolved
      const allHighConfidence = places.length > 0 &&
        places.every((p) => (p.confidence ?? 0) >= 0.7 && p.status !== 'unresolved');

      if (allHighConfidence) {
        const firstResolved = places.find((p) => p.place_id);
        if (firstResolved) {
          store.autoSavePlace(firstResolved, sourceUrl);
          return;
        }
      }

      // Some or all places need confirmation — show selection sheet
      if (places.length > 0) {
        store.openSaveSheet(store.query || '', places);
      }
    }
  },
  Component: SaveFlow,
};
