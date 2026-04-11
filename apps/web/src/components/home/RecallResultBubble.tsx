'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { RecallResponseData, RecallItem } from '@totoro/shared';

interface RecallResultBubbleProps {
  message: string;
  data: RecallResponseData;
}

function RecallCard({ place, index }: { place: RecallItem; index: number }) {
  const meta = [place.cuisine, place.price_range].filter(Boolean).join(' · ');
  const savedDate = place.saved_at
    ? new Date(place.saved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Thumbnail / icon */}
      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-muted flex items-center justify-center">
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{place.place_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {meta && `${meta} · `}{place.address}
        </p>
        {place.match_reason && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5 italic">{place.match_reason}</p>
        )}
      </div>

      {/* Saved date */}
      {savedDate && (
        <span className="flex-shrink-0 text-xs text-muted-foreground/60">{savedDate}</span>
      )}
    </div>
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
      className="flex gap-2 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3 w-full max-w-[85%]">
        <p className="text-sm font-medium text-foreground mb-2">{message}</p>
        <div className="flex flex-col">
          {data.results.map((place, i) => (
            <RecallCard key={place.place_id || i} place={place} index={i} />
          ))}
        </div>
        {data.has_more && (
          <p className="text-xs text-muted-foreground/60 mt-2 text-center">
            +{data.total - data.results.length} more saved places
          </p>
        )}
      </div>
    </div>
  );
}
