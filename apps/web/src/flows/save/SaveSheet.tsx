'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { SaveExtractPlace } from '@totoro/shared';

interface SaveSheetProps {
  places: SaveExtractPlace[];
  selectedIndex: number;
  status: 'pending' | 'saving' | 'duplicate' | 'error';
  onSelectPlace: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  originalSavedAt?: string | null;
}

function SavePlaceCard({
  place,
  index,
  onSave,
}: {
  place: SaveExtractPlace;
  index: number;
  onSave: () => void;
}) {
  const needsConfirmation = place.confidence !== undefined && place.confidence < 0.7;
  const confidencePercent = place.confidence ? Math.round(place.confidence * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
    >
      {/* Thumbnail */}
      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted" />

      {/* Place info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm truncate">
          {place.place_name || 'Unknown place'}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {place.cuisine && `${place.cuisine} • `}
          {place.price_range && `${place.price_range} • `}
          {place.address || (confidencePercent ? `${confidencePercent}% match` : 'Tap to confirm')}
        </p>
      </div>

      {/* Save/Confirm button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSave}
        className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          needsConfirmation
            ? 'border border-amber-500/50 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900'
            : 'border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
        }`}
      >
        {needsConfirmation ? 'Confirm' : '+ Save'}
      </motion.button>
    </motion.div>
  );
}

export function SaveSheet({ places, status, onSelectPlace, onConfirm, onCancel }: SaveSheetProps) {
  const handleSave = (index: number) => {
    onSelectPlace(index);
    onConfirm();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Did you mean one of these?</h2>
          <p className="text-xs text-muted-foreground mt-1">Tap to save. Confirm if unsure.</p>
        </div>
        <button
          onClick={onCancel}
          disabled={status === 'saving'}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {/* Results list */}
      <div className="space-y-2">
        <AnimatePresence>
          {places.map((place, idx) => (
            <SavePlaceCard
              key={place.place_id ?? `place-${idx}`}
              place={place}
              index={idx}
              onSave={() => handleSave(idx)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Status messages */}
      <AnimatePresence>
        {status === 'saving' && (
          <motion.p
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground text-center"
          >
            Saving…
          </motion.p>
        )}
        {status === 'error' && (
          <motion.p
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-destructive text-center"
          >
            Couldn't save. Try again.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {places.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
          <p className="text-sm text-muted-foreground">No places found</p>
        </motion.div>
      )}
    </div>
  );
}
