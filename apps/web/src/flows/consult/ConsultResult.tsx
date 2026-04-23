'use client';

import type { ConsultResponseData } from '@totoro/shared';
import { useTranslations } from 'next-intl';
import { PlaceCard } from '../../components/PlaceCard';
import { useHomeStore } from '../../store/home-store';
import { cn } from '@totoro/ui';

function SourceBadge({ source }: { source: 'saved' | 'discovered' }) {
  const t = useTranslations('consult.result.source');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
        source === 'saved'
          ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
          : 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          source === 'saved' ? 'bg-green-500' : 'bg-orange-400',
        )}
      />
      {t(source)}
    </span>
  );
}

interface AcceptRejectProps {
  recommendationId: string | null;
  placeId: string;
}

function AcceptRejectActions({ recommendationId, placeId }: AcceptRejectProps) {
  const t = useTranslations('consult.result.actions');
  const acceptPlace = useHomeStore((s) => s.acceptPlace);
  const rejectPlace = useHomeStore((s) => s.rejectPlace);

  if (!recommendationId) return null;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => void acceptPlace(recommendationId, placeId)}
        className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
      >
        {t('accept')}
      </button>
      <button
        onClick={() => void rejectPlace(recommendationId, placeId)}
        className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
      >
        {t('reject')}
      </button>
    </div>
  );
}

export function ConsultResult({ result }: { result: ConsultResponseData }) {
  const t = useTranslations('consult.result');
  const [primary, ...alternatives] = result.results;

  return (
    <div className="flex flex-col gap-4">
      {/* Primary PlaceCard — expanded by default */}
      {primary && (
        <>
          <PlaceCard
            place={primary.place}
            defaultExpanded
            badge={<SourceBadge source={primary.source} />}
            action={
              <AcceptRejectActions
                recommendationId={result.recommendation_id}
                placeId={primary.place.place_id}
              />
            }
          />
        </>
      )}

      {/* Alternatives — collapsed, vertical list */}
      {alternatives.length > 0 && (
        <>
          <p className="text-xs italic text-muted-foreground">{t('divider')}</p>
          <div className="flex flex-col gap-3">
            {alternatives.map((alt) => (
              <PlaceCard
                key={alt.place.place_id}
                place={alt.place}
                badge={<SourceBadge source={alt.source} />}
                action={
                  <AcceptRejectActions
                    recommendationId={result.recommendation_id}
                    placeId={alt.place.place_id}
                  />
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
