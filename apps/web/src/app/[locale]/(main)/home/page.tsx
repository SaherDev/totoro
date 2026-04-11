'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { ChatInput } from '@/components/ChatInput';
import { HomeIdle } from '@/components/home/HomeIdle';
import { TasteProfileCelebration } from '@/components/home/TasteProfileCelebration';
import { UserBubble } from '@/components/home/UserBubble';
import { AssistantBubble } from '@/components/home/AssistantBubble';
import { ConsultError } from '@/components/home/ConsultError';
import { ConsultResult } from '@/flows/consult/ConsultResult';
import { TASTE_CHIP_BANK } from '@/constants/home-suggestions';
import { TotoroCard } from '@totoro/ui';
import { useHomeStore, type ThreadEntry } from '@/store/home-store';
import { FLOW_REGISTRY } from '@/flows/registry';

function ThreadEntryView({ entry }: { entry: ThreadEntry }) {
  if (entry.role === 'user') {
    return <UserBubble content={entry.content} />;
  }
  if (entry.type === 'clarification') {
    return <AssistantBubble message={entry.message} />;
  }
  if (entry.type === 'consult') {
    return <ConsultResult message={entry.message} result={entry.data} />;
  }
  if (entry.type === 'error') {
    return null; // ConsultError needs onTryAgain — handled inline below
  }
  return null;
}

export default function HomePage() {
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const t = useTranslations();
  const store = useHomeStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    store.hydrate();
    store.init({ userId: userId ?? null, getToken: async () => (await getToken()) ?? '' });
  }, []); // intentional: run once on mount

  // Auto-scroll to bottom when thread grows or active flow changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [store.thread.length, store.activeFlowId]);

  const placeholderKey = store.activeFlowId
    ? FLOW_REGISTRY[store.activeFlowId].inputPlaceholderKey
    : 'consult.placeholder';

  const hasThread = store.thread.length > 0;

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 flex flex-col gap-4">

          {/* Empty state — shown only before any interaction */}
          {!hasThread && !store.activeFlowId && (() => {
            switch (store.phase) {
              case 'idle':
                return (
                  <HomeIdle
                    onSuggestionClick={store.submit}
                    firstName={user?.firstName}
                    savedCount={store.savedPlaceCount}
                  />
                );
              case 'taste-profile':
                return <TasteProfileCelebration chips={TASTE_CHIP_BANK} onStartExploring={store.confirmTasteProfile} />;
              case 'cold-0':
              case 'cold-1-4':
                // Placeholder — built in sub-plans 7 & 8
                return <HomeIdle onSuggestionClick={store.submit} />;
              default:
                return null;
            }
          })()}

          {/* Thread — all past exchanges */}
          {store.thread.map((entry) => {
            if (entry.role === 'assistant' && entry.type === 'error') {
              return (
                <ConsultError
                  key={entry.id}
                  error={{ message: entry.category, category: entry.category }}
                  onTryAgain={() => store.submit(store.query ?? '', { isRetry: true })}
                />
              );
            }
            return <ThreadEntryView key={entry.id} entry={entry} />;
          })}

          {/* Active in-progress flow — thinking animation */}
          {store.activeFlowId && (() => {
            const FlowComponent = FLOW_REGISTRY[store.activeFlowId].Component;
            return <FlowComponent store={store} />;
          })()}

        </div>
      </div>

      {/* Always-mounted input bar */}
      <div className="px-4 pb-4 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
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
