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
import { ColdStartZero } from '@/flows/cold-start-zero/ColdStartZero';
import { ColdStartOneFour } from '@/flows/cold-start-1-4/ColdStartOneFour';
import { UserBubble } from '@/components/home/UserBubble';
import { AssistantBubble } from '@/components/home/AssistantBubble';
import { SaveResultBubble } from '@/components/home/SaveResultBubble';
import { RecallResultBubble } from '@/components/home/RecallResultBubble';
import { ConsultError } from '@/components/home/ConsultError';
import { SaveError } from '@/components/home/SaveError';
import { ConsultResult } from '@/flows/consult/ConsultResult';
import { TASTE_CHIP_BANK } from '@/constants/home-suggestions';
import { TotoroCard } from '@totoro/ui';
import { useHomeStore, type ThreadEntry, type HomeStoreApi } from '@/store/home-store';
import { FLOW_REGISTRY } from '@/flows/registry';

function ThreadEntryView({ entry }: { entry: ThreadEntry }) {
  if (entry.role === 'user') {
    return <UserBubble content={entry.content} />;
  }
  if (entry.type === 'clarification' || entry.type === 'assistant') {
    return <AssistantBubble message={entry.message} type={entry.type} />;
  }
  if (entry.type === 'consult') {
    return <ConsultResult message={entry.message} result={entry.data} />;
  }
  if (entry.type === 'save') {
    return <SaveResultBubble place={entry.place} sourceUrl={entry.sourceUrl} />;
  }
  if (entry.type === 'recall') {
    return <RecallResultBubble message={entry.message} data={entry.data} />;
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

  // Only show flow-specific placeholder during idle/resting states — clear it during any active phase
  const RESTING_PHASES: Set<string> = new Set(['idle', 'cold-0', 'cold-1-4', 'taste-profile']);
  const placeholderKey = (store.activeFlowId && RESTING_PHASES.has(store.phase))
    ? FLOW_REGISTRY[store.activeFlowId].inputPlaceholderKey
    : 'chat.placeholder';

  const hasThread = store.thread.length > 0;

  // Render nothing until hydration resolves — prevents flash of wrong phase
  if (!store.hydrated) return null;

  return (
    <div className="flex h-dvh flex-col bg-background">
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
                return <ColdStartZero onSuggestionClick={store.submit} />;
              case 'cold-1-4':
                return <ColdStartOneFour store={store} />;
              default:
                return null;
            }
          })()}

          {/* Thread — all past exchanges */}
          {store.thread.map((entry) => {
            if (entry.role === 'assistant' && entry.type === 'error') {
              const ErrorComponent = entry.flowId === 'save' ? SaveError : ConsultError;
              return (
                <ErrorComponent
                  key={entry.id}
                  error={{ message: entry.category, category: entry.category }}
                  onTryAgain={() => store.submit(store.query ?? '', { isRetry: true })}
                />
              );
            }
            return <ThreadEntryView key={entry.id} entry={entry} />;
          })}


          {/* Universal thinking indicator — shown for any flow while waiting for API */}
          {store.phase === 'thinking' && store.activeFlowId !== 'consult' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
              <span className="truncate max-w-[220px] text-muted-foreground/70">
                {store.activeFlowId === 'save' ? 'Looking up your place…' : 'Working on it…'}
              </span>
            </div>
          )}

          {/* Active in-progress flow component */}
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
                disabled={store.phase === 'thinking'}
                placeholder={t(placeholderKey as Parameters<typeof t>[0])}
              />
            </div>
          </TotoroCard>
        </div>
      </div>
    </div>
  );
}
