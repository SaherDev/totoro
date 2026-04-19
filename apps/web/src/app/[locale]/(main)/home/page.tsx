'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { ChatInput } from '@/components/ChatInput';
import { HomeIdle } from '@/components/home/HomeIdle';
import { TasteProfileCelebration } from '@/components/home/TasteProfileCelebration';
import { ChipSelectionBoard } from '@/components/home/ChipSelectionBoard';
import { SavedProgressNudge } from '@/components/home/SavedProgressNudge';
import { ColdStartZero } from '@/flows/cold-start-zero/ColdStartZero';
import { ColdStartOneFour } from '@/flows/cold-start-1-4/ColdStartOneFour';
import { UserBubble } from '@/components/home/UserBubble';
import { AssistantBubble } from '@/components/home/AssistantBubble';
import { RecallResultBubble } from '@/components/home/RecallResultBubble';
import { PlaceCard } from '@/components/PlaceCard';
import { ConsultError } from '@/components/home/ConsultError';
import { SaveError } from '@/components/home/SaveError';
import { ConsultResult } from '@/flows/consult/ConsultResult';
import { TASTE_CHIP_BANK } from '@/constants/home-suggestions';
import { Illustration } from '@/components/illustrations/Illustration';
import { TotoroCard } from '@totoro/ui';
import { useHomeStore, type ThreadEntry } from '@/store/home-store';
import { FLOW_REGISTRY } from '@/flows/registry';

const LOADING_LINES = [
  'Sniffing out your taste…',
  'Consulting the forest spirits…',
  'Reading your food memories…',
  'Counting your saves…',
  'Building your taste map…',
  'Almost there — Totoro is thinking…',
];

function TotoroLoadingScreen() {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => (i + 1) % LOADING_LINES.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-dvh flex-col items-center bg-background px-8 animate-fade-in">
      {/* Illustration sits in top portion */}
      <div className="flex flex-1 items-end justify-center pb-10">
        <Illustration
          id="knowing"
          className="h-52 w-52 [animation:bounce_1.6s_ease-in-out_infinite]"
        />
      </div>

      {/* Text + dots anchored at center-bottom */}
      <div className="flex flex-1 flex-col items-center gap-3 pt-10">
        <p
          key={lineIdx}
          className="animate-fade-in text-center text-base font-medium text-foreground"
        >
          {LOADING_LINES[lineIdx]}
        </p>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function ThreadEntryView({ entry }: { entry: ThreadEntry }) {
  if (entry.role === 'user') {
    return <UserBubble content={entry.content} />;
  }
  if (entry.type === 'clarification' || entry.type === 'assistant') {
    return <AssistantBubble message={entry.message} type={entry.type} />;
  }
  if (entry.type === 'consult') {
    return (
      <div className="flex flex-col gap-4">
        <AssistantBubble message={entry.message} type="assistant" />
        <ConsultResult result={entry.data} />
      </div>
    );
  }
  if (entry.type === 'save') {
    if (!entry.item.place) return null;
    const badge = entry.item.status === 'duplicate'
      ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">Duplicate</span>
      : <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">Saved ✓</span>;
    return <PlaceCard place={entry.item.place} badge={badge} />;
  }
  if (entry.type === 'recall') {
    return (
      <div className="flex flex-col gap-3">
        <AssistantBubble message={entry.message} type="assistant" />
        <RecallResultBubble message={entry.message} data={entry.data} />
      </div>
    );
  }
  if (entry.type === 'error') {
    return null;
  }
  return null;
}

const RESTING_PHASES = new Set(['idle', 'cold-0', 'cold-1-4', 'taste-profile', 'chip-selection']);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [store.thread.length, store.activeFlowId]);

  const placeholderKey = (store.activeFlowId && RESTING_PHASES.has(store.phase))
    ? FLOW_REGISTRY[store.activeFlowId].inputPlaceholderKey
    : 'chat.placeholder';

  const hasThread = store.thread.length > 0;

  if (!store.hydrated) return null;

  if (store.contextLoading) {
    return <TotoroLoadingScreen />;
  }

  return (
    <div className="flex h-dvh flex-col bg-background animate-fade-in">
      <NavBar>
        <NavBarLogo />
        <NavBarActions>
          <ProfileMenu />
        </NavBarActions>
      </NavBar>

      <div className="flex flex-1 overflow-hidden">
        {/* Scrollable message area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 flex flex-col gap-4">

            {/* Warming nudge */}
            {store.signalTier === 'warming' && (
              <SavedProgressNudge
                count={store.savedPlacesCountFromContext ?? store.savedPlaceCount}
                tier={store.signalTier}
              />
            )}

            {/* Chip selection — always shown when in this phase, regardless of thread */}
            {store.phase === 'chip-selection' && (
              <ChipSelectionBoard
                chips={store.chips}
                onConfirm={(chips) => void store.confirmChips(chips)}
                onSkip={() => store.reset()}
              />
            )}

            {/* Empty state — only when no thread and no active flow */}
            {store.phase !== 'chip-selection' && !hasThread && !store.activeFlowId && (() => {
              switch (store.phase) {
                case 'idle':
                  return (
                    <HomeIdle
                      onSuggestionClick={store.submit}
                      firstName={user?.firstName}
                      savedCount={store.savedPlacesCountFromContext ?? store.savedPlaceCount}
                      chips={store.chips.length > 0 ? store.chips : undefined}
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

            {/* Thread */}
            {store.thread.map((entry) => {
              if (entry.role === 'assistant' && entry.type === 'error') {
                const ErrorComponent = entry.flowId === 'save' ? SaveError : ConsultError;
                return (
                  <ErrorComponent
                    key={entry.id}
                    error={{ message: entry.category, category: entry.category, ...('rateLimitInfo' in entry && entry.rateLimitInfo ? { rateLimitInfo: entry.rateLimitInfo } : {}) }}
                    onTryAgain={() => store.submit(store.query ?? '', { isRetry: true })}
                  />
                );
              }
              return <ThreadEntryView key={entry.id} entry={entry} />;
            })}

            {/* Thinking indicator */}
            {store.phase === 'thinking' && store.activeFlowId !== 'consult' && (
              <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </div>
                <span className="max-w-[220px] truncate text-muted-foreground/70">
                  {store.activeFlowId === 'save' ? 'Looking up your place…' : 'Working on it…'}
                </span>
              </div>
            )}

            {/* Active flow */}
            {store.activeFlowId && (() => {
              const FlowComponent = FLOW_REGISTRY[store.activeFlowId].Component;
              return <FlowComponent store={store} />;
            })()}

          </div>
        </div>

      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <TotoroCard elevation="floating" className="overflow-hidden">
            <div className="p-2">
              <ChatInput
                onSubmit={store.submit}
                disabled={store.phase === 'thinking' || store.phase === 'chip-selection'}
                placeholder={t(placeholderKey as Parameters<typeof t>[0])}
              />
            </div>
          </TotoroCard>
        </div>
      </div>
    </div>
  );
}
