'use client';

import { useTranslations } from 'next-intl';
import type { HomePhase } from '@/flows/flow-definition';

interface HomeGreetingProps {
  phase: HomePhase;
}

const GREETING_PHASES: HomePhase[] = ['idle', 'cold-0', 'cold-1-4'];

export function HomeGreeting({ phase }: HomeGreetingProps) {
  const t = useTranslations('home.idle');

  if (!GREETING_PHASES.includes(phase)) return null;

  return (
    <p className="text-center text-sm text-muted-foreground">
      {t('headline')}
    </p>
  );
}
