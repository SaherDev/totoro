'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage } from '@/components/ChatMessage';
import { AgentResponseBubble } from '@/components/AgentResponseBubble';
import { HomeEmptyState } from '@/components/home-empty-state';
import { TotoroCard } from '@totoro/ui';
import { TotoroStepListen } from '@/components/illustrations/totoro-illustrations';

type MessageItem = {
  id: string;
  type: 'user' | 'agent-response';
  content?: string;
  flow?: 'recommend' | 'add-place' | 'recall';
  hasError?: boolean;
  isEcho?: boolean;
};

// Intent detection patterns (extracted to constants to avoid recreation on every render)
const RECALL_INTENT_PATTERN = /\b(recall|find|search|look up|lookup)\b/i;
const RECALL_OBJECT_PATTERN = /\b(saved|collection|places)\b/i;
const URL_PATTERN = /https?:\/\/\S+/i;
const SAVE_INTENT_PATTERN = /\b(add|adding|save|saving|saved)\b/i;
const PLACE_HINT_PATTERN = /\b(place|spot|restaurant|cafe|coffee|link)\b/i;
const SAVE_PREFIX_PATTERN = /^save\s+/i;

function detectFlow(text: string): 'recommend' | 'add-place' | 'recall' {
  // Recall check must come before add-place to avoid false positives
  // (e.g. "Recall a saved place" matches saveIntent + placeHint)
  const isRecall = RECALL_INTENT_PATTERN.test(text) && RECALL_OBJECT_PATTERN.test(text);
  if (isRecall) return 'recall';

  const hasUrl = URL_PATTERN.test(text);
  const saveIntent = SAVE_INTENT_PATTERN.test(text);
  const placeHint = PLACE_HINT_PATTERN.test(text);
  const isAddPlace = hasUrl || (saveIntent && placeHint) || SAVE_PREFIX_PATTERN.test(text);

  return isAddPlace ? 'add-place' : 'recommend';
}

export default function HomePage() {
  const t = useTranslations('home');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // useChat for recommend flow streaming
  const {
    messages: consultMessages,
    append,
    isLoading: isConsulting,
    error: consultError,
  } = useChat({ api: '/api/consult', streamProtocol: 'text' });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, consultMessages]);

  // Memoize handleSend with useCallback to prevent unnecessary re-renders of child components
  const handleSend = useCallback((text: string, fromButton = false) => {
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
    };

    const flow = detectFlow(text);

    if (flow === 'recommend') {
      // For recommend flow, use useChat streaming
      setMessages((prev) => [...prev, userMsg]);
      append({ role: 'user', content: text });
    } else {
      // For recall and add-place flows, use local state
      const agentMsg: MessageItem = {
        id: `agent-${Date.now() + 1}`,
        type: 'agent-response',
        flow,
        content: fromButton ? undefined : text,
        isEcho: !fromButton,
      };
      setMessages((prev) => [...prev, userMsg, agentMsg]);
    }
  }, [append]);

  // Memoize allMessages to prevent unnecessary recalculations and child re-renders
  const allMessages = useMemo(
    () => [
      ...messages,
      ...consultMessages.map((msg) => ({
        id: msg.id,
        type: msg.role === 'user' ? ('user' as const) : ('agent-response' as const),
        content: msg.content || undefined,
        flow: msg.role === 'assistant' ? ('recommend' as const) : undefined,
        hasError: msg.role === 'assistant' ? !!consultError : undefined,
      })),
    ],
    [messages, consultMessages, consultError]
  );

  const isEmpty = allMessages.length === 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Navigation Bar */}
      <NavBar>
        <NavBarLogo />
        <NavBarActions>
          <ProfileMenu />
        </NavBarActions>
      </NavBar>

      {/* Main Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <AnimatePresence mode="wait">
            {isEmpty && !isVoiceMode ? (
              <HomeEmptyState
                key="empty"
                onSuggestion={(text) => handleSend(text, true)}
                isVoiceMode={isVoiceMode}
                isListening={isListening}
              />
            ) : isVoiceMode ? (
              <motion.div
                key="voice"
                className="flex flex-col items-center justify-center pt-16 pb-8 md:pt-24"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] lg:w-[240px] lg:h-[240px] mb-6"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div
                    className="w-full h-full"
                    animate={
                      isListening ? { scale: [1, 1.05, 1], rotate: [0, -2, 2, 0] } : { scale: 1 }
                    }
                    transition={
                      isListening ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}
                    }
                  >
                    <TotoroStepListen />
                  </motion.div>
                </motion.div>
                <h2 className="font-display text-2xl text-foreground mb-2 md:text-3xl">
                  {isListening ? t('listening') : t('tapToTalk')}
                </h2>
                <p className="font-body text-sm text-muted-foreground text-center max-w-xs leading-relaxed md:text-base">
                  {t('voicePrompt')}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                className="flex flex-col gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {allMessages.map((msg) =>
                  msg.type === 'user' ? (
                    <ChatMessage key={msg.id} role="user" content={msg.content || ''} />
                  ) : (
                    <AgentResponseBubble
                      key={msg.id}
                      hasError={msg.hasError}
                      flow={msg.flow}
                      content={msg.flow === 'recommend' ? msg.content : (msg.isEcho ? msg.content : undefined)}
                    />
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Input */}
      <div className="px-4 pb-4 md:pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <TotoroCard elevation="floating" className="overflow-hidden">
            <div className="p-2">
              <ChatInput
                disabled={isConsulting}
                onSend={handleSend}
                onVoiceModeChange={setIsVoiceMode}
                onListeningChange={setIsListening}
              />
            </div>
          </TotoroCard>
        </div>
      </div>

    </div>
  );
}
