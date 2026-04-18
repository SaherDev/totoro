'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ExtractPlaceItem } from '@totoro/shared';
import { PlaceCard } from '../../components/PlaceCard';
import { cn } from '@totoro/ui';

// ── Badges ─────────────────────────────────────────────────────────────────────

function ConfidencePill({ item }: { item: ExtractPlaceItem }) {
  if (item.status === 'saved') {
    return (
      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
        Saved ✓
      </span>
    );
  }
  if (item.status === 'duplicate') {
    const savedOn = item.place?.created_at
      ? new Date(item.place.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;
    return (
      <span className="rounded-full border border-amber-500/50 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        {savedOn ? `Duplicate · saved ${savedOn}` : 'Duplicate'}
      </span>
    );
  }
  if (item.status === 'needs_review' && item.confidence != null) {
    return (
      <span className="rounded-full border border-amber-500/50 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        {Math.round(item.confidence * 100)}% match
      </span>
    );
  }
  return null;
}

// ── Action buttons ─────────────────────────────────────────────────────────────

interface StatusButtonProps {
  item: ExtractPlaceItem;
  isSaved: boolean;
  onSave: () => void;
}

function StatusButton({ item, isSaved, onSave }: StatusButtonProps) {
  if (item.status === 'saved' || item.status === 'duplicate') return null;

  if (isSaved) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
        Saved
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onSave}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        item.status === 'needs_review'
          ? 'border border-amber-500/50 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100'
          : 'border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10',
      )}
    >
      {item.status === 'needs_review' ? 'Confirm' : '+ Save'}
    </motion.button>
  );
}

// ── SaveSheet ──────────────────────────────────────────────────────────────────

interface SaveSheetProps {
  places: ExtractPlaceItem[];
  onSavePlace: (item: ExtractPlaceItem) => void;
  onClose: (savedItems: ExtractPlaceItem[]) => void;
}

export function SaveSheet({ places, onSavePlace, onClose }: SaveSheetProps) {
  const cardItems = places.filter((p) => p.place !== null);
  const pendingCount = places.filter((p) => p.place === null && p.status === 'pending').length;
  const failedCount = places.filter((p) => p.place === null && p.status === 'failed').length;

  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    cardItems.forEach((item) => {
      if (item.status === 'saved' && item.place) initial.add(item.place.place_id);
    });
    return initial;
  });

  // Auto-save status==='saved' items on mount
  const autoSaveFired = useRef(false);
  useEffect(() => {
    if (autoSaveFired.current) return;
    autoSaveFired.current = true;
    cardItems.forEach((item) => {
      if (item.status === 'saved') onSavePlace(item);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave(item: ExtractPlaceItem) {
    if (!item.place) return;
    setSavedIds((prev) => new Set(prev).add(item.place!.place_id));
    onSavePlace(item);
  }

  function handleClose() {
    const savedItems = cardItems.filter((item) => item.place && savedIds.has(item.place.place_id));
    onClose(savedItems);
  }

  const savedCount = savedIds.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Did you mean one of these?</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tap to confirm. Swipe to dismiss.</p>
        </div>
        <button
          onClick={handleClose}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {savedCount > 0 ? `Done (${savedCount})` : 'Cancel'}
        </button>
      </div>

      {/* Summary lines */}
      {pendingCount > 0 && (
        <p className="text-xs text-muted-foreground">{pendingCount} still processing…</p>
      )}
      {failedCount > 0 && (
        <p className="text-xs text-muted-foreground">{failedCount} couldn't be extracted</p>
      )}

      {/* Card list */}
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {cardItems.map((item, idx) => (
            <motion.div
              key={item.place!.place_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <PlaceCard
                place={item.place!}
                badge={<ConfidencePill item={item} />}
                action={
                  <StatusButton
                    item={item}
                    isSaved={savedIds.has(item.place!.place_id)}
                    onSave={() => handleSave(item)}
                  />
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {cardItems.length === 0 && pendingCount === 0 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center text-sm text-muted-foreground">
          No places found
        </motion.p>
      )}
    </div>
  );
}
