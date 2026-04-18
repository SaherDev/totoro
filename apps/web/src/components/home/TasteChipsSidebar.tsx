'use client';

import { useState } from 'react';
import type { ChipItem, SignalTier } from '@totoro/shared';
import { cn } from '@totoro/ui';

interface TasteChipsSidebarProps {
  chips: ChipItem[];
  tier: SignalTier;
}

export function TasteChipsSidebar({ chips, tier }: TasteChipsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (chips.length === 0) return null;
  if (tier !== 'warming' && tier !== 'active') return null;

  const chipEl = (chip: ChipItem) => (
    <span
      key={chip.label}
      className={cn(
        'rounded-full px-2.5 py-1 text-xs',
        chip.status === 'confirmed' && 'bg-primary text-primary-foreground',
        chip.status === 'rejected' && 'bg-muted text-muted-foreground line-through',
        chip.status === 'pending' && 'border border-border text-foreground',
      )}
    >
      {chip.label}
    </span>
  );

  return (
    <>
      {/* Desktop — right rail */}
      <aside className="sticky top-0 hidden w-52 shrink-0 self-start pt-4 md:flex md:flex-col md:gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your taste
        </p>
        <div className="flex flex-wrap gap-1.5">{chips.map(chipEl)}</div>
      </aside>

      {/* Mobile — bottom strip */}
      <div className="fixed bottom-0 start-0 end-0 z-40 border-t border-border bg-background md:hidden">
        <button
          className="flex w-full items-center justify-between px-4 py-3"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your taste
          </span>
          <span className="text-xs text-muted-foreground">{mobileOpen ? '▾' : '▸'}</span>
        </button>
        {mobileOpen && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">{chips.map(chipEl)}</div>
        )}
      </div>
    </>
  );
}
