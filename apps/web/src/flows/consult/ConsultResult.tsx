'use client';

import type { ConsultResponseData } from '@totoro/shared';
import { useTranslations } from 'next-intl';
import { PrimaryResultCard } from './PrimaryResultCard';
import { AlternativeCard } from './AlternativeCard';
import { TasteMatchArc } from './TasteMatchArc';
import { CommunityProofLine } from './CommunityProofLine';

export function ConsultResult({ message, result }: { message: string; result: ConsultResponseData }) {
  const t = useTranslations('consult.result');

  return (
    <div className="flex flex-col gap-4">
      {/* Result header — uses live message from API */}
      <div className="flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{ color: '#c8890a' }}
        >
          <path
            d="M2 8l4 4 8-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-semibold text-foreground">{message}</span>
      </div>

      {/* Primary card with TasteMatchArc + CommunityProofLine children */}
      <PrimaryResultCard result={result.primary}>
        <TasteMatchArc />
      </PrimaryResultCard>
      <CommunityProofLine />

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <>
          <p className="text-xs italic text-muted-foreground">{t('divider')}</p>
          <div className="grid grid-cols-2 gap-3">
            {result.alternatives.map((alt, i) => (
              <AlternativeCard key={alt.place_name} alt={alt} delayMs={i * 50} />
            ))}
          </div>
        </>
      )}

    </div>
  );
}
