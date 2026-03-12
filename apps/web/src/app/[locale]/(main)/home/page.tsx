'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { ChatInput } from '@/components/ChatInput';
import { TotoroCard } from '@totoro/ui';

type Message = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
};

export default function HomePage() {
  const t = useTranslations();
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);

    // Simulate agent response (placeholder)
    setTimeout(() => {
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: `I found a great recommendation for you based on "${text}". Let me show you the details...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 1000);
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
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <AnimatePresence mode="wait">
            {isEmpty ? (
              <motion.div
                key="empty"
                className="flex flex-col items-center justify-center min-h-full py-12"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                <h1 className="font-display text-4xl text-foreground mb-4 md:text-5xl">
                  {t('home.whereTo')}
                </h1>
                <p className="font-body text-base text-muted-foreground text-center max-w-sm leading-relaxed md:text-lg mb-8">
                  {t('home.moodPrompt')}
                </p>

                {/* Illustration */}
                <div className="mb-12 h-40 w-full max-w-sm">
                  <Image
                    src="/illustrations/totoro-home-input.svg"
                    alt="Totoro"
                    width={300}
                    height={200}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    'cheapDinner',
                    'bestCoffee',
                    'dateNight',
                    'brunch',
                    'savePlace',
                  ].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSend(t(`home.suggestions.${key}`))}
                      className="rounded-full bg-card px-5 py-2.5 font-body text-sm text-foreground shadow-totoro-sm transition-all duration-200 hover:shadow-totoro-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-totoro-sm"
                      suppressHydrationWarning
                    >
                      {t(`home.suggestions.${key}`)}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                className="flex flex-col gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-foreground border border-border'
                      }`}
                    >
                      <p className="font-body text-sm leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </motion.div>
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
            <ChatInput onSend={handleSend} />
          </TotoroCard>
        </div>
      </div>
    </div>
  );
}
