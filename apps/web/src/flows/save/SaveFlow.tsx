'use client';

import { AnimatePresence } from 'framer-motion';
import type { HomeStoreApi } from '@/store/home-store';
import type { SaveExtractPlace } from '@totoro/shared';
import { SaveSheet } from './SaveSheet';

interface SaveFlowProps {
  store: HomeStoreApi;
}

export function SaveFlow({ store }: SaveFlowProps) {
  const { saveSheetPlaces, phase } = store;

  return (
    <AnimatePresence mode="wait">
      {phase === 'save-sheet' && (
        <SaveSheet
          key="sheet"
          places={saveSheetPlaces}
          onSavePlace={(place: SaveExtractPlace) => store.saveIndividualFromSheet(place)}
          onClose={(savedPlaces: SaveExtractPlace[]) => {
            if (savedPlaces.length > 0) {
              store.closeSaveSheetWithResults(savedPlaces);
            } else {
              store.dismissSaveSheet();
            }
          }}
        />
      )}
    </AnimatePresence>
  );
}
