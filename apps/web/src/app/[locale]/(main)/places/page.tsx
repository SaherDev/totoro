'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { TotoroEmpty } from '@/components/illustrations/totoro-illustrations';

export default function PlacesPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'saved' | 'history'>('saved');

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
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-3 font-body text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'saved'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('places.saved')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-body text-sm transition-colors border-b-2 -mb-px ${
                activeTab === 'history'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('places.history')}
            </button>
          </div>

          {/* Empty State */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="flex flex-col items-center justify-center py-16"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              <div className="w-32 h-32 md:w-40 md:h-40 mb-6">
                <TotoroEmpty />
              </div>
              <h2 className="font-display text-2xl text-foreground text-center mb-2">
                {activeTab === 'saved' ? t('places.noSaved') : t('places.noHistory')}
              </h2>
              <p className="font-body text-sm text-muted-foreground text-center max-w-sm">
                {activeTab === 'saved' ? t('places.noSavedDesc') : t('places.noHistoryDesc')}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
