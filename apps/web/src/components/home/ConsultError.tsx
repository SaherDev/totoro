'use client';

import { useTranslations } from 'next-intl';
import { Illustration } from '@/components/illustrations/Illustration';
import type { RateLimitInfo } from '@/lib/chat-client';

type ErrorCategory = 'offline' | 'timeout' | 'server' | 'rate_limit' | 'generic';

interface ConsultErrorProps {
  error: { message: string; category: ErrorCategory; rateLimitInfo?: RateLimitInfo } | null;
  onTryAgain: () => void;
}

export function ConsultError({ error, onTryAgain }: ConsultErrorProps) {
  const t = useTranslations('consult.error');
  const category: ErrorCategory = error?.category ?? 'generic';

  const body = category === 'rate_limit' && error?.rateLimitInfo
    ? t(`rate_limit.${error.rateLimitInfo.limit}` as Parameters<typeof t>[0], { limit_value: error.rateLimitInfo.limit_value })
    : t(`${category}.body` as Parameters<typeof t>[0]);

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
          {body}
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
