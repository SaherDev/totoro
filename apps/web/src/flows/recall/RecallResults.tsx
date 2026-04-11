'use client';

import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import type { RecallItem } from '@totoro/shared';

interface RecallResultsProps {
  results: RecallItem[];
  hasMore: boolean;
  breadcrumb: boolean;
  onModeOverride: () => void;
}

function RecallResultCard({ item, index }: { item: RecallItem; index: number }) {
  return (
    <motion.div
      key={item.place_id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex gap-3">
        {/* Thumbnail placeholder */}
        <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-muted" />

        {/* Place info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{item.place_name}</h3>
          <p className="text-sm text-muted-foreground truncate">{item.address}</p>
          {item.cuisine && <p className="text-xs text-muted-foreground mt-1">{item.cuisine}</p>}
          <p className="text-xs text-muted-foreground mt-2">{item.match_reason}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function RecallResults({ results, hasMore, breadcrumb, onModeOverride }: RecallResultsProps) {
  const t = useTranslations('recall');

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <AnimatePresence>
        {breadcrumb && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4"
          >
            <p className="text-xs text-muted-foreground animate-pulse">{t('breadcrumb')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode override pill */}
      <div className="px-4">
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onModeOverride}
          className="text-xs text-primary hover:text-primary/80 transition-colors border border-primary/20 rounded-full px-3 py-1.5"
        >
          {t('modeOverride')}
        </motion.button>
      </div>

      {/* Results list */}
      <div className="space-y-2 px-4">
        <AnimatePresence>
          {results.map((item, idx) => (
            <RecallResultCard key={item.place_id} item={item} index={idx} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {results.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-6 px-4"
        >
          <p className="text-sm text-muted-foreground">{t('emptyFooter')}</p>
        </motion.div>
      )}

      {/* Has more indicator */}
      {hasMore && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-3 px-4"
        >
          <p className="text-xs text-muted-foreground">{t('hasMore')}</p>
        </motion.div>
      )}
    </div>
  );
}
