'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ChipItem, ChipStatus } from '@totoro/shared';
import { cn } from '@totoro/ui';

interface ChipSelectionBoardProps {
  chips: ChipItem[];
  onConfirm: (chips: ChipItem[]) => void;
  onSkip: () => void;
}

type LocalStatus = ChipStatus;

export function ChipSelectionBoard({ chips, onConfirm, onSkip }: ChipSelectionBoardProps) {
  const t = useTranslations('chipSelection');

  const currentRound = useMemo(
    () => chips.find((c) => c.status === 'pending')?.selection_round ?? null,
    [chips],
  );

  const actionable = useMemo(
    () => chips.filter((c) => c.status === 'pending' && c.selection_round === currentRound),
    [chips, currentRound],
  );

  const fromBefore = useMemo(
    () => chips.filter((c) => !actionable.includes(c)),
    [chips, actionable],
  );

  // Local toggle state: label → status
  const [decisions, setDecisions] = useState<Record<string, LocalStatus>>(() =>
    Object.fromEntries(actionable.map((c) => [c.label, c.status])),
  );

  const hasChanges = actionable.some((c) => decisions[c.label] !== 'pending');

  function cycleStatus(label: string) {
    setDecisions((prev) => {
      const current = prev[label] ?? 'pending';
      const next: LocalStatus =
        current === 'pending' ? 'confirmed' : current === 'confirmed' ? 'rejected' : 'pending';
      return { ...prev, [label]: next };
    });
  }

  function handleConfirm() {
    const decidedChips = actionable
      .filter((c) => decisions[c.label] !== 'pending')
      .map((c) => ({ ...c, status: decisions[c.label] as ChipStatus }));
    onConfirm(decidedChips);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm md:items-center">
      <div className="flex w-full flex-col gap-6 bg-background p-6 md:max-w-lg md:rounded-2xl md:border md:border-border md:shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Actionable chips */}
        {actionable.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actionable.map((chip) => {
              const status = decisions[chip.label] ?? 'pending';
              return (
                <button
                  key={chip.label}
                  onClick={() => cycleStatus(chip.label)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    status === 'confirmed' && 'bg-primary text-primary-foreground',
                    status === 'rejected' && 'bg-muted text-muted-foreground line-through opacity-60',
                    status === 'pending' && 'border border-border text-foreground hover:bg-accent',
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        )}

        {/* From before — read-only */}
        {fromBefore.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('fromBefore')}
            </p>
            <div className="flex flex-wrap gap-2">
              {fromBefore.map((chip) => (
                <span
                  key={chip.label}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm',
                    chip.status === 'confirmed' && 'bg-primary/10 text-primary',
                    chip.status === 'rejected' && 'bg-muted text-muted-foreground line-through',
                    chip.status === 'pending' && 'border border-border/50 text-muted-foreground',
                  )}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!hasChanges}
            className={cn(
              'flex-1 rounded-xl py-3 text-sm font-semibold transition-colors',
              hasChanges
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            {t('done')}
          </button>
          <button
            onClick={onSkip}
            className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
