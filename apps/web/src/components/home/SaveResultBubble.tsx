'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { SaveExtractPlace } from '@totoro/shared';

interface SaveResultBubbleProps {
  place: SaveExtractPlace;
  sourceUrl: string | null;
}

export function SaveResultBubble({ place, sourceUrl }: SaveResultBubbleProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const meta = [place.cuisine, place.price_range, place.address].filter(Boolean).join(' · ');

  return (
    <div
      className="flex gap-2 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3 flex gap-3 items-start max-w-[85%]">
        {/* Check badge */}
        <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {place.place_name ?? 'Place saved'}
          </p>
          {meta && (
            <p className="text-xs text-muted-foreground truncate">{meta}</p>
          )}
          {sourceUrl && (
            <p className="text-xs text-muted-foreground/70 truncate">{sourceUrl}</p>
          )}
          <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">Saved to your list</p>
        </div>
      </div>
    </div>
  );
}
