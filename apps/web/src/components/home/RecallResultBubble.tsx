'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { RecallResponseData, RecallItem } from '@totoro/shared';

interface RecallResultBubbleProps {
  message: string;
  data: RecallResponseData;
}

function RecallCard({ place, index }: { place: RecallItem; index: number }) {
  const meta = [place.cuisine, place.price_range, place.address].filter(Boolean).join(' · ');
  const savedDate = place.saved_at
    ? new Date(place.saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
    >
      {/* Thumbnail placeholder */}
      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{place.place_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{meta}</p>
        {place.match_reason && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5 italic">{place.match_reason}</p>
        )}
      </div>

      {/* Saved date */}
      {savedDate && (
        <span className="flex-shrink-0 text-xs text-muted-foreground/60">{savedDate}</span>
      )}
    </motion.div>
  );
}

export function RecallResultBubble({ message, data }: RecallResultBubbleProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="flex flex-col gap-3 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <p className="text-sm font-medium text-foreground px-1">{message}</p>
      <div className="space-y-2">
        {data.results.map((place, i) => (
          <RecallCard key={place.place_id || i} place={place} index={i} />
        ))}
      </div>
      {data.has_more && (
        <p className="text-xs text-muted-foreground/60 text-center">
          +{data.total - data.results.length} more saved places
        </p>
      )}
    </div>
  );
}
