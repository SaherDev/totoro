'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface SavedSnackbarProps {
  placeName: string;
  onUndo?: () => void;
  onDismiss?: () => void;
}

export function SavedSnackbar({ placeName, onUndo, onDismiss }: SavedSnackbarProps) {
  const t = useTranslations('save');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border bg-background p-4 shadow-lg"
    >
      <div className="flex items-center gap-3">
        {/* Success icon */}
        <motion.div
          className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6 }}
        >
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
        </motion.div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {t('saved', { place: placeName })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onUndo && (
            <button
              onClick={onUndo}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              {t('undo')}
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
