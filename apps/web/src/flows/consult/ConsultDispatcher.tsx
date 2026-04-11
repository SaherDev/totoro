'use client';

import type { HomeStoreApi } from '@/store/home-store';
import { ConsultThinking } from './ConsultThinking';

/** Shows the thinking animation while the consult flow is in progress.
 *  The result is pushed to the chat thread on completion and rendered there. */
export function ConsultDispatcher({ store }: { store: HomeStoreApi }) {
  if (store.phase === 'thinking') {
    return (
      <ConsultThinking
        query={store.query ?? ''}
        reasoningSteps={store.reasoningSteps}
        fetchComplete={store.fetchComplete}
        onAnimationComplete={store.markAnimationComplete}
      />
    );
  }

  return null;
}
