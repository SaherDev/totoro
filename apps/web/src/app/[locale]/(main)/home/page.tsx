'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage } from '@/components/ChatMessage';
import { HomeEmptyState } from '@/components/home-empty-state';
import { TotoroCard } from '@totoro/ui';

type MessageItem = {
  id: string;
  type: 'user';
  content: string;
};

export default function HomePage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, type: 'user', content: text },
    ]);
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

      {/* Message Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <AnimatePresence mode="wait">
            {isEmpty ? (
              <HomeEmptyState
                key="empty"
                onSuggestion={handleSend}
                isVoiceMode={false}
                isListening={false}
              />
            ) : (
              <motion.div
                key="messages"
                className="flex flex-col gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} role="user" content={msg.content} />
                ))}
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
              <ChatInput onSend={handleSend} />
            </div>
          </TotoroCard>
        </div>
      </div>
    </div>
  );
}
