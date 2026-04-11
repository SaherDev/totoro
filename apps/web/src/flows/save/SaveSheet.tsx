'use client';

import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
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

function PlaceOption({ place, isSelected, onSelect }: { place: SaveExtractPlace; isSelected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      key={place.place_id}
      onClick={onSelect}
      className={`w-full rounded-2xl border-2 px-4 py-3 text-start transition-all ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail placeholder */}
        <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted" />

        {/* Place info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{place.place_name || 'Unknown place'}</h3>
          <p className="text-sm text-muted-foreground truncate">{place.address}</p>
          {place.cuisine && <p className="text-xs text-muted-foreground mt-1">{place.cuisine}</p>}
        </div>

        {/* Selection indicator */}
        <div className="flex-shrink-0">
          {isSelected ? (
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>
    </motion.button>
  );
}

export function SaveSheet({ places, selectedIndex, status, onSelectPlace, onConfirm, onCancel, originalSavedAt }: SaveSheetProps) {
  const t = useTranslations('flow4');
  const selectedPlace = places[selectedIndex];
  const isDuplicate = selectedPlace?.status === 'duplicate';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border bg-background p-6 shadow-lg"
    >
      {/* Header */}
      <h3 className="font-display text-lg text-foreground mb-4">{t('heading')}</h3>

      {/* Places list */}
      <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {places.map((place, idx) => (
            <PlaceOption
              key={place.place_id}
              place={place}
              isSelected={idx === selectedIndex}
              onSelect={() => onSelectPlace(idx)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Duplicate warning */}
      {isDuplicate && originalSavedAt && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-sm"
        >
          <p className="text-amber-900 dark:text-amber-100">
            {t('duplicate', { date: new Date(originalSavedAt).toLocaleDateString() })}
          </p>
        </motion.div>
      )}

      {/* Status message */}
      <AnimatePresence>
        {status === 'saving' && (
          <motion.p
            key="saving"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground mb-4 text-center"
          >
            {t('saving')}
          </motion.p>
        )}
        {status === 'error' && (
          <motion.p
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-destructive mb-4 text-center"
          >
            {t('error')}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={status === 'saving'}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground font-body text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={status === 'saving'}
          className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDuplicate ? t('saveDuplicate') : t('confirm')}
        </button>
      </div>

      {/* Undo link for taste signals */}
      <button className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center">
        {t('undoLink')}
      </button>
    </motion.div>
  );
}
