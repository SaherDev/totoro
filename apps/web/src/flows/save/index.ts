import type { FlowDefinition } from '../flow-definition';
import type { HomeStoreApi } from '@/store/home-store';
import { ExtractPlaceDataSchema } from './save.schema';
import { saveFixture } from './save.fixtures';
import { SaveFlow } from './SaveFlow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic flow type
export const saveFlow: FlowDefinition<any> = {
  id: 'save',
  matches: { clientIntent: 'save', responseType: 'extract-place' },
  phase: 'thinking',
  inputPlaceholderKey: 'home.suggestions.save',
  schema: ExtractPlaceDataSchema,
  fixture: saveFixture,
  onResponse: (res, store: HomeStoreApi) => {
    if (res.type === 'extract-place' && res.data) {
      const parsed = ExtractPlaceDataSchema.safeParse(res.data);
      if (!parsed.success) {
        store.pushMessage("Something went wrong processing your place. Please try again.");
        return;
      }
      const data = parsed.data;
      if (data.results.length > 0) {
        store.pushMessage(res.message);
        store.openSaveSheet(res.message, data.results, data.source_url);
      }
    }
  },
  Component: SaveFlow,
};
