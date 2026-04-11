import type { ExtractPlaceData } from '@totoro/shared';
import type { FlowDefinition } from '../flow-definition';
import type { HomeStoreApi } from '@/store/home-store';
import { ExtractPlaceDataSchema } from './save.schema';
import { saveFixture } from './save.fixtures';
import { SaveFlow } from './SaveFlow';

export const saveFlow: FlowDefinition<ExtractPlaceData> = {
  id: 'save',
  matches: { clientIntent: 'save', responseType: 'extract-place' },
  phase: 'save-sheet',
  inputPlaceholderKey: 'home.suggestions.save',
  schema: ExtractPlaceDataSchema,
  fixture: saveFixture,
  onResponse: (res, store: HomeStoreApi) => {
    if (res.type === 'extract-place' && res.data) {
      const data = res.data as ExtractPlaceData;
      store.openSaveSheet(store.query || '', data.places);
    }
  },
  Component: SaveFlow,
};
