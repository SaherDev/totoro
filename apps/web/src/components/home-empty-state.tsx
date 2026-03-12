'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { TotoroHomeInput, TotoroStepListen } from '@/components/illustrations/totoro-illustrations';

interface HomeEmptyStateProps {
  onSuggestion: (text: string) => void;
  isVoiceMode: boolean;
  isListening: boolean;
}

export function HomeEmptyState({
  onSuggestion,
  isVoiceMode,
  isListening,
}: HomeEmptyStateProps) {
  const t = useTranslations();

  const suggestions = [
    t('home.suggestions.cheapDinner'),
    t('home.suggestions.bestCoffee'),
    t('home.suggestions.dateNight'),
    t('home.suggestions.brunch'),
    t('home.suggestions.savePlace'),
  ];

  return (
    <motion.div
      className="flex flex-col items-center justify-center pt-16 pb-8 md:pt-24"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence mode="wait">
        {isVoiceMode ? (
          <motion.div
            key="listening"
            className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] lg:w-[240px] lg:h-[240px] mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
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
        ) : (
          <motion.div
            key="default"
            className="w-[140px] h-[140px] md:w-[180px] md:h-[180px] lg:w-[220px] lg:h-[220px] mb-8 anim-bob"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
          >
            <TotoroHomeInput />
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="font-display text-2xl text-foreground mb-2 md:text-3xl">
        {isVoiceMode ? (isListening ? t('home.listening') : t('home.tapToTalk')) : t('home.whereTo')}
      </h2>
      <p className="font-body text-sm text-muted-foreground text-center max-w-xs leading-relaxed md:text-base mb-8">
        {isVoiceMode ? t('home.voicePrompt') : t('home.moodPrompt')}
      </p>

      {!isVoiceMode && (
        <div className="flex flex-wrap justify-center gap-2.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestion(suggestion)}
              className="rounded-full bg-card px-5 py-2.5 font-body text-sm text-foreground shadow-totoro-md transition-all duration-200 hover:shadow-totoro-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-totoro-sm"
              suppressHydrationWarning
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
