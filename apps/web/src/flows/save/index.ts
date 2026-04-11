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
  phase: 'thinking',
  inputPlaceholderKey: 'home.suggestions.save',
  schema: ExtractPlaceDataSchema,
  fixture: saveFixture,
  onResponse: (res, store: HomeStoreApi) => {
    if (res.type === 'extract-place' && res.data) {
      const rawData = res.data as Record<string, unknown>;

      // Provisional — API is still processing the URL in the background
      if (rawData['provisional'] === true) {
        store.pushMessage(
          "We're working on saving your place. It's being processed in the background and will be added to your list shortly.",
        );
        return;
      }

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

      // Always show the sheet — high-confidence places auto-mark as saved on open,
      // low-confidence ones show Confirm. User sees everything that was extracted.
      if (places.length > 0) {
        store.openSaveSheet(store.query || '', places);
      }
    }
  },
  Component: SaveFlow,
};
