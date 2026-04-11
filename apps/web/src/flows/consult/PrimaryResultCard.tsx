'use client';

import { useTranslations } from 'next-intl';
import { UtensilsCrossed } from 'lucide-react';
import type { ConsultPlace } from '@totoro/shared';
import { cn } from '@totoro/ui';

interface PrimaryResultCardProps {
  result: ConsultPlace;
  children?: React.ReactNode;
}

export function PrimaryResultCard({ result, children }: PrimaryResultCardProps) {
  const t = useTranslations('consult.result');

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm [animation:card-enter_300ms_cubic-bezier(0.34,1.56,0.64,1)_forwards]">
      {/* Hero photo (16:9, 110px tall) */}
      <div className="relative h-[110px] w-full overflow-hidden bg-muted">
        {result.photos?.hero ? (
          <img
            src={result.photos.hero}
            alt={result.place_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-muted/60">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Place name overlay */}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3">
          <h3 className="text-base font-semibold text-white">{result.place_name}</h3>
        </div>

        {/* TasteMatchArc slot — top-end corner */}
        {children && <div className="absolute end-3 top-3">{children}</div>}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Address */}
        <p className="text-sm text-muted-foreground">{result.address}</p>

        {/* Reasoning — warm bg with gold start border */}
        <div className="rounded-lg border-s-2 border-accent-gold bg-accent-gold-soft p-3">
          <p className="text-sm leading-relaxed text-foreground">{result.reasoning}</p>
        </div>

        {/* Source attribution */}
        <p className="text-xs text-muted-foreground">
          {t(`source.${result.source}` as Parameters<typeof t>[0])}
        </p>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-2">
          {(['directions', 'call', 'share', 'menu'] as const).map((action) => (
            <button
              key={action}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                action === 'directions'
                  ? 'bg-accent-gold text-background hover:bg-accent-gold/90'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {t(`actions.${action}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes card-enter {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </article>
  );
}
