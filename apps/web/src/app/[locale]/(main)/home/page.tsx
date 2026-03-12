'use client';

import { useState, useRef, useEffect } from 'react';
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
  flow?: 'recommend' | 'add-place';
  hasError?: boolean;
  isEcho?: boolean;
};

export default function HomePage() {
  const t = useTranslations('home');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string, fromButton = false) => {
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
    };

    // Check if this is an add-place intent
    const hasUrl = /https?:\/\/\S+/i.test(text);
    const saveIntent = /\b(add|adding|save|saving|saved)\b/i.test(text);
    const placeHint = /\b(place|spot|restaurant|cafe|coffee|link)\b/i.test(text);
    const isAddPlace = hasUrl || (saveIntent && placeHint) || /^save\s+/i.test(text);

    const agentMsg: MessageItem = {
      id: `agent-${Date.now() + 1}`,
      type: 'agent-response',
      flow: isAddPlace ? 'add-place' : 'recommend',
      content: fromButton ? undefined : text,
      isEcho: !fromButton,
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
  };


  const isEmpty = messages.length === 0;

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
                {messages.map((msg) =>
                  msg.type === 'user' ? (
                    <ChatMessage key={msg.id} role="user" content={msg.content || ''} />
                  ) : (
                    <AgentResponseBubble
                      key={msg.id}
                      hasError={msg.hasError}
                      flow={msg.flow}
                      content={msg.isEcho ? msg.content : undefined}
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
