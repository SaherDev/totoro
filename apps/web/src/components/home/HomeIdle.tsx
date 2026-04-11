'use client';

import { useTranslations } from 'next-intl';
import { TotoroIdleWelcoming } from '@/components/illustrations/totoro-illustrations';
import { CONSULT_SUGGESTIONS } from '@/constants/home-suggestions';

interface HomeIdleProps {
  onSuggestionClick: (text: string) => void;
}

export function HomeIdle({ onSuggestionClick }: HomeIdleProps) {
  const t = useTranslations('home.idle');

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="h-32 w-32">
        <TotoroIdleWelcoming />
      </div>

      <h2 className="text-center text-xl font-semibold text-foreground">
        {t('headline')}
      </h2>

      <div className="flex flex-wrap justify-center gap-2">
        {CONSULT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
