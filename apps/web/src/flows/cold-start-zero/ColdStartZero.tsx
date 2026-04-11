'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Illustration } from '@/components/illustrations/Illustration';

interface ColdStartZeroProps {
  onSuggestionClick: (text: string) => void;
}

export function ColdStartZero({ onSuggestionClick }: ColdStartZeroProps) {
  const t = useTranslations('coldStartZero');

  const steps = [
    { title: t('step1.title'), subtitle: t('step1.subtitle') },
    { title: t('step2.title'), subtitle: t('step2.subtitle') },
    { title: t('step3.title'), subtitle: t('step3.subtitle') },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Illustration */}
      <div className="h-32 w-32">
        <Illustration id="raining" />
      </div>

      {/* Headline & Subline */}
      <div className="flex flex-col items-center gap-2 text-center max-w-sm">
        <h2 className="text-2xl font-display text-foreground">{t('headline')}</h2>
        <p className="text-sm text-muted-foreground">{t('subline')}</p>
      </div>

      {/* Steps */}
      <div className="w-full space-y-3 max-w-sm">
        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="rounded-2xl border border-border bg-muted p-4"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted-foreground/30 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{step.subtitle}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Paste hint */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">{t('pasteHint')}</p>
      </div>

      {/* Suggestions */}
      <div className="w-full space-y-2 max-w-sm">
        <button
          onClick={() => onSuggestionClick(t('suggestion1'))}
          className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-start text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {t('suggestion1')}
        </button>
        <button
          onClick={() => onSuggestionClick(t('suggestion2'))}
          className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-start text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {t('suggestion2')}
        </button>
      </div>
    </div>
  );
}
