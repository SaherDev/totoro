'use client';

import { useTranslations } from 'next-intl';
import { Illustration } from '@/components/illustrations/Illustration';
import { CONSULT_SUGGESTIONS } from '@/constants/home-suggestions';
import type { ChipItem } from '@totoro/shared';

interface HomeIdleProps {
  onSuggestionClick: (text: string) => void;
  firstName?: string | null;
  savedCount?: number;
  chips?: ChipItem[];
}

function getSuggestions(chips: ChipItem[] | undefined): string[] {
  const chipSuggestions = (chips ?? [])
    .filter((c) => c.status === 'confirmed' && c.query && c.query.trim().length > 0)
    .sort((a, b) => b.signal_count - a.signal_count)
    .slice(0, 3)
    .map((c) => c.query as string);

  if (chipSuggestions.length === 0) return CONSULT_SUGGESTIONS;

  // Pad with hardcoded if fewer than 3 chip suggestions
  const fallback = CONSULT_SUGGESTIONS.filter((s) => !chipSuggestions.includes(s));
  return [...chipSuggestions, ...fallback].slice(0, 3);
}

export function HomeIdle({ onSuggestionClick, firstName, savedCount, chips }: HomeIdleProps) {
  const t = useTranslations('home.idle');

  const visibleChips = (chips ?? [])
    .filter((c) => c.status === 'confirmed')
    .sort((a, b) => b.signal_count - a.signal_count)
    .slice(0, 6);
  const suggestions = getSuggestions(chips);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Personalized greeting */}
      {firstName && (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-lg font-semibold text-foreground">
            {t('greeting', { name: firstName })}
          </p>
          {savedCount !== undefined && savedCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('savedCount', { count: savedCount })}
            </p>
          )}
        </div>
      )}

      <div className="h-32 w-32">
        <Illustration id="idle-welcoming" />
      </div>

      {/* Top confirmed chips — display only */}
      {visibleChips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {visibleChips.map((chip) => (
              <span
                key={chip.label}
                className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
              >
                {chip.label}
              </span>
            ))}
        </div>
      )}

      <h2 className="text-center text-xl font-semibold text-foreground">
        {t('headline')}
      </h2>

      <div className="flex w-full flex-col gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-start text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
