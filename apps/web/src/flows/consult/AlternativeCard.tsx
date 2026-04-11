'use client';

import type { ConsultPlace } from '@totoro/shared';

interface AlternativeCardProps {
  alt: ConsultPlace;
  delayMs?: number;
}

export function AlternativeCard({ alt, delayMs = 0 }: AlternativeCardProps) {
  return (
    <article
      className="overflow-hidden rounded-xl border border-border bg-background p-3 [animation:alt-enter_400ms_ease_forwards]"
      style={{ animationDelay: `${delayMs}ms`, opacity: 0 }}
    >
      {/* 1:1 photo */}
      <div className="mb-2 h-16 w-full overflow-hidden rounded-lg bg-muted">
        {alt.photos?.square ? (
          <img
            src={alt.photos.square}
            alt={alt.place_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-muted/60" />
        )}
      </div>

      <h4 className="text-sm font-semibold text-foreground">{alt.place_name}</h4>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{alt.address}</p>

      <style>{`
        @keyframes alt-enter {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </article>
  );
}
