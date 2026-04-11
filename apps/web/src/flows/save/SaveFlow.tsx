'use client';

import { AnimatePresence } from 'framer-motion';
import type { HomeStoreApi } from '@/store/home-store';
import { SaveSheet } from './SaveSheet';
import { SavedSnackbar } from './SavedSnackbar';

interface SaveFlowProps {
  store: HomeStoreApi;
}

export function SaveFlow({ store }: SaveFlowProps) {
  const { saveSheetPlaces, saveSheetSelectedIndex, saveSheetStatus, saveSheetOriginalSavedAt, phase } = store;

  const selectedPlace = saveSheetPlaces[saveSheetSelectedIndex];

  return (
    <AnimatePresence mode="wait">
      {/* Save sheet — place selection */}
      {phase === 'save-sheet' && (
        <SaveSheet
          key="sheet"
          places={saveSheetPlaces}
          selectedIndex={saveSheetSelectedIndex}
          status={saveSheetStatus}
          onSelectPlace={(index) => store.setSaveSheetSelectedIndex(index)}
          onConfirm={() => {
            // For unresolved places, save directly without API call
            // For resolved places, confirm through API
            const selectedPlace = saveSheetPlaces[saveSheetSelectedIndex];
            if (selectedPlace?.status === 'unresolved' || !selectedPlace?.place_id) {
              store.confirmPlaceSelection();
            } else {
              store.confirmSave();
            }
          }}
          onCancel={() => store.dismissSaveSheet()}
          originalSavedAt={saveSheetOriginalSavedAt}
        />
      )}

      {/* Success snackbar */}
      {phase === 'save-snackbar' && selectedPlace && selectedPlace.place_name && (
        <SavedSnackbar
          key="snackbar"
          placeName={selectedPlace.place_name}
          onUndo={() => {
            // TODO: Implement undo
            store.dismissSaveSheet();
          }}
          onDismiss={() => store.dismissSaveSheet()}
        />
      )}
    </AnimatePresence>
  );
}
