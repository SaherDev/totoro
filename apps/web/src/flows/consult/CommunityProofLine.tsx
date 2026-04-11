'use client';

import { useTranslations } from 'next-intl';
import { COMMUNITY_PROOF_COUNT } from '@/constants/placeholders';

export function CommunityProofLine() {
  const t = useTranslations('consult.result');

  return (
    <p className="text-sm italic text-muted-foreground">
      {t('communityProof', { count: COMMUNITY_PROOF_COUNT })}
    </p>
  );
}
