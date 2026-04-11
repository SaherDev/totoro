'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TotoroExcited } from '@/components/illustrations/totoro-illustrations';

type ChipState = 'pending' | 'confirmed' | 'dismissed';

interface TasteProfileCelebrationProps {
  chips: string[];
  onStartExploring: () => void;
}

export function TasteProfileCelebration({ chips, onStartExploring }: TasteProfileCelebrationProps) {
  const t = useTranslations('tasteProfile');
  const [chipStates, setChipStates] = useState<ChipState[]>(chips.map(() => 'pending'));

  const toggleChip = (i: number) => {
    setChipStates((prev) => {
      const next = [...prev];
      next[i] = prev[i] === 'confirmed' ? 'dismissed' : 'confirmed';
      return next;
    });
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="h-32 w-32">
        <TotoroExcited />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-semibold text-foreground">{t('headline')}</h2>
        <p className="text-sm text-muted-foreground">{t('subline')}</p>
      </div>

      {/* Taste chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {chips.map((chip, i) => (
          <button
            key={chip}
            onClick={() => toggleChip(i)}
            className={
              chipStates[i] === 'confirmed'
                ? 'rounded-full border px-4 py-2 text-sm font-medium transition-colors bg-forest-soft text-forest border-forest-soft/60'
                : chipStates[i] === 'dismissed'
                  ? 'rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors opacity-25 bg-muted text-muted-foreground'
                  : 'rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
            }
          >
            {chip}
          </button>
        ))}
      </div>

      <button
        onClick={onStartExploring}
        className="rounded-xl bg-accent-gold px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-gold/90"
      >
        {t('cta')}
      </button>
    </div>
  );
}
