'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { PlaceAvatar } from '@/components/PlaceAvatar';
import type { SaveExtractPlace } from '@totoro/shared';

interface SaveSheetProps {
  places: SaveExtractPlace[];
  onSavePlace: (place: SaveExtractPlace) => void;
  onClose: (savedPlaces: SaveExtractPlace[]) => void;
}

function SavePlaceCard({
  place,
  index,
  isSaved,
  onSave,
}: {
  place: SaveExtractPlace;
  index: number;
  isSaved: boolean;
  onSave: () => void;
}) {
  const needsConfirmation = place.confidence !== undefined && place.confidence < 0.7;
  const confidencePercent = place.confidence ? Math.round(place.confidence * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
    >
      <PlaceAvatar name={place.place_name || 'place'} size={48} className="rounded-lg overflow-hidden" />

      {/* Place info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm truncate">
          {place.place_name || 'Unknown place'}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {place.cuisine && `${place.cuisine} · `}
          {place.price_range && `${place.price_range} · `}
          {place.address || (confidencePercent ? `${confidencePercent}% match` : 'Tap to confirm')}
        </p>
      </div>

      {/* Action button — toggles to saved state inline */}
      <AnimatePresence mode="wait">
        {isSaved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
            Saved
          </motion.div>
        ) : (
          <motion.button
            key="action"
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SaveSheet({ places, onSavePlace, onClose }: SaveSheetProps) {
  // High-confidence places (≥70%) start as already saved
  const [savedIndices, setSavedIndices] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    places.forEach((p, i) => {
      if ((p.confidence ?? 0) >= 0.7 && p.status !== 'unresolved') {
        initial.add(i);
      }
    });
    return initial;
  });

  // Auto-save high-confidence places on mount (fires once)
  const autoSaveFired = useRef(false);
  useEffect(() => {
    if (autoSaveFired.current) return;
    autoSaveFired.current = true;
    places.forEach((p) => {
      if ((p.confidence ?? 0) >= 0.7 && p.status !== 'unresolved') {
        onSavePlace(p);
      }
    });
  }, []);

  const handleSave = (index: number) => {
    setSavedIndices((prev) => new Set(prev).add(index));
    onSavePlace(places[index]);
  };

  const handleClose = () => {
    const savedPlaces = Array.from(savedIndices).map((i) => places[i]);
    onClose(savedPlaces);
  };

  const savedCount = savedIndices.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Did you mean one of these?</h2>
          <p className="text-xs text-muted-foreground mt-1">Tap to save. Confirm if unsure.</p>
        </div>
        <button
          onClick={handleClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {savedCount > 0 ? `Done (${savedCount})` : 'Cancel'}
        </button>
      </div>

      {/* Results list */}
      <div className="space-y-2">
        {places.map((place, idx) => (
          <SavePlaceCard
            key={place.place_id ?? `place-${idx}`}
            place={place}
            index={idx}
            isSaved={savedIndices.has(idx)}
            onSave={() => handleSave(idx)}
          />
        ))}
      </div>

      {/* Empty state */}
      {places.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
          <p className="text-sm text-muted-foreground">No places found</p>
        </motion.div>
      )}
    </div>
  );
}
