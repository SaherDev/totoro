'use client';

import { useTranslations } from 'next-intl';
import { Illustration } from '@/components/illustrations/Illustration';
import { CONSULT_SUGGESTIONS } from '@/constants/home-suggestions';

interface HomeIdleProps {
  onSuggestionClick: (text: string) => void;
  firstName?: string | null;
  savedCount?: number;
}

export function HomeIdle({ onSuggestionClick, firstName, savedCount }: HomeIdleProps) {
  const t = useTranslations('home.idle');

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

      <h2 className="text-center text-xl font-semibold text-foreground">
        {t('headline')}
      </h2>

      <div className="flex w-full flex-col gap-2">
        {CONSULT_SUGGESTIONS.map((suggestion) => (
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
