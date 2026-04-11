'use client';

import { Illustration } from '@/components/illustrations/Illustration';

type ErrorCategory = 'offline' | 'timeout' | 'server' | 'generic';

interface SaveErrorProps {
  error: { message: string; category: ErrorCategory } | null;
  onTryAgain: () => void;
}

export function SaveError({ error, onTryAgain }: SaveErrorProps) {
  const category: ErrorCategory = error?.category ?? 'generic';

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="h-32 w-32">
        <Illustration id="idle-welcoming" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {category === 'offline' ? "Can't save right now" : "Couldn't save this place"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {category === 'offline' ? 'Check your connection and try again.' : 'Something went wrong. Try again.'}
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
