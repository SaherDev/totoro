'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage } from '@/components/ChatMessage';
import { AgentResponseBubble } from '@/components/AgentResponseBubble';
import { HomeEmptyState } from '@/components/home-empty-state';
import { AddPlaceModal } from '@/components/add-place-modal';
import { TotoroCard } from '@totoro/ui';

type MessageItem = {
  id: string;
  type: 'user' | 'agent-response';
  content?: string;
  flow?: 'recommend' | 'add-place';
  hasError?: boolean;
};

export default function HomePage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string) => {
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
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
  };

  const handleAddPlaceSubmit = (url: string) => {
    handleSend(url);
    setIsAddPlaceModalOpen(false);
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
            {isEmpty ? (
              <HomeEmptyState
                key="empty"
                onSuggestion={handleSend}
                isVoiceMode={isVoiceMode}
                isListening={isListening}
              />
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
                onAddPlace={() => setIsAddPlaceModalOpen(true)}
              />
            </div>
          </TotoroCard>
        </div>
      </div>

      {/* Add Place Modal */}
      <AddPlaceModal
        isOpen={isAddPlaceModalOpen}
        onClose={() => setIsAddPlaceModalOpen(false)}
        onSubmit={handleAddPlaceSubmit}
      />
    </div>
  );
}
