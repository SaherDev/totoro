'use client';

import { useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { ChatInput } from '@/components/ChatInput';
import { HomeIdle } from '@/components/home/HomeIdle';
import { HomeGreeting } from '@/components/home/HomeGreeting';
import { TasteProfileCelebration } from '@/components/home/TasteProfileCelebration';
import { ClarificationHint } from '@/components/layout/ClarificationHint';
import { TASTE_CHIP_BANK } from '@/constants/home-suggestions';
import { TotoroCard } from '@totoro/ui';
import { useHomeStore } from '@/store/home-store';
import { FLOW_REGISTRY } from '@/flows/registry';

export default function HomePage() {
  const { userId, getToken } = useAuth();
  const t = useTranslations();

  const store = useHomeStore();

  useEffect(() => {
    store.hydrate();
    store.init({ userId: userId ?? null, getToken: async () => (await getToken()) ?? '' });
  }, []); // intentional: run once on mount — hydrate reads localStorage, init seeds auth

  const placeholderKey = store.activeFlowId
    ? FLOW_REGISTRY[store.activeFlowId].inputPlaceholderKey
    : 'consult.placeholder';

  const content = useMemo(() => {
    // Flow state — delegate to the active flow's component
    if (store.activeFlowId) {
      const FlowComponent = FLOW_REGISTRY[store.activeFlowId].Component;
      return <FlowComponent store={store} />;
    }

    // Resting phases
    switch (store.phase) {
      case 'idle':
        return <HomeIdle onSuggestionClick={store.submit} />;
      case 'cold-0':
      case 'cold-1-4':
        // Placeholder — components built in sub-plans 7 & 8
        return <div />;
      case 'taste-profile':
        return <TasteProfileCelebration chips={TASTE_CHIP_BANK} onStartExploring={store.confirmTasteProfile} />;
      case 'error':
        // Placeholder — ConsultError wired when consult flow is active
        return <div />;
      case 'hydrating':
      default:
        return null;
    }
  }, [store.phase, store.activeFlowId, store.submit]);

  // Render nothing until hydration resolves — prevents flash of wrong phase
  if (!store.hydrated) return null;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Navigation Bar */}
      <NavBar>
        <NavBarLogo />
        <NavBarActions>
          <ProfileMenu />
        </NavBarActions>
      </NavBar>

      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <HomeGreeting phase={store.phase} />
          {content}
        </div>
      </div>

      {/* Always-mounted input bar */}
      <div className="px-4 pb-4 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <ClarificationHint message={store.clarificationMessage} />
          <TotoroCard elevation="floating" className="overflow-hidden">
            <div className="p-2">
              <ChatInput
                onSubmit={store.submit}
                placeholder={t(placeholderKey as Parameters<typeof t>[0])}
              />
            </div>
          </TotoroCard>
        </div>
      </div>
    </div>
  );
}
