'use client';

import { useTranslations } from 'next-intl';
import { Illustration } from '@/components/illustrations/Illustration';

type ErrorCategory = 'offline' | 'timeout' | 'server' | 'generic';

interface ConsultErrorProps {
  error: { message: string; category: ErrorCategory } | null;
  onTryAgain: () => void;
}

export function ConsultError({ error, onTryAgain }: ConsultErrorProps) {
  const t = useTranslations('consult.error');
  const category: ErrorCategory = error?.category ?? 'generic';

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="h-32 w-32">
        <Illustration id="idle-welcoming" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {t(`${category}.headline` as Parameters<typeof t>[0])}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(`${category}.body` as Parameters<typeof t>[0])}
        </p>
      </div>

      <button
        onClick={onTryAgain}
        className="rounded-xl bg-accent-gold px-6 py-3 text-sm font-semibold text-background hover:bg-accent-gold/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
