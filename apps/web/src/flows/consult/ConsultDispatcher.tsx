'use client';

import type { HomeStoreApi } from '@/store/home-store';
import { ConsultThinking } from './ConsultThinking';
import { ConsultResult } from './ConsultResult';

/** Routes between ConsultThinking and ConsultResult based on store.phase */
export function ConsultDispatcher({ store }: { store: HomeStoreApi }) {
  if (store.phase === 'thinking') {
    return (
      <ConsultThinking
        query={store.query ?? ''}
        contextPills={store.result?.context_chips ?? []}
        reasoningSteps={store.reasoningSteps}
        onAnimationComplete={store.markAnimationComplete}
      />
    );
  }

  if (store.phase === 'result') {
    return <ConsultResult />;
  }

  return null;
}
