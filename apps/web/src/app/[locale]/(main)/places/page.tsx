'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { NavBar, NavBarLogo, NavBarActions } from '@/components/NavBar';
import { ProfileMenu } from '@/components/profile-menu';
import { PlaceCard } from '@/components/PlaceCard';
import { TotoroSavedPlaces } from '@/components/illustrations/totoro-illustrations';

// Mock data for saved places and recommendation history
const MOCK_SAVED_PLACES = [
  {
    id: '1',
    name: 'Osteria Francescana',
    address: 'Via Stella 22, Modena',
    reasoning:
      'Exceptional Italian cuisine with a focus on traditional Emilian dishes. Great for special occasions.',
    source: 'saved' as const,
    cuisine: 'Italian',
    priceRange: '$$',
    savedDate: '2024-03-01',
  },
  {
    id: '2',
    name: 'Trattoria da Mario',
    address: 'Piazza del Mercato 5, Florence',
    reasoning: 'Local favorite. Authentic, affordable, and always packed. Arrive early or book ahead.',
    source: 'saved' as const,
    cuisine: 'Italian',
    priceRange: '$',
    savedDate: '2024-02-28',
  },
  {
    id: '3',
    name: 'Noma Pop-Up',
    address: 'Refshaleøen 96, Copenhagen',
    reasoning: 'Innovative Nordic cuisine with seasonal ingredients. A must-try for food enthusiasts.',
    source: 'saved' as const,
    cuisine: 'Nordic',
    priceRange: '$$$',
    savedDate: '2024-02-25',
  },
];

const MOCK_RECOMMENDATIONS_HISTORY = [
  {
    id: 'rec-1',
    name: 'Beef & Liberty',
    address: '123 Main St, New York',
    reasoning: 'Modern American steakhouse. Perfect for business lunches and celebrations.',
    source: 'discovered' as const,
    cuisine: 'Steakhouse',
    priceRange: '$$',
    recommendedDate: '2024-03-10',
  },
  {
    id: 'rec-2',
    name: 'Le Bernardin',
    address: '155 West 51st St, New York',
    reasoning: 'World-renowned seafood restaurant. Elegant and sophisticated dining experience.',
    source: 'discovered' as const,
    cuisine: 'Seafood',
    priceRange: '$$$',
    recommendedDate: '2024-03-08',
  },
];

export default function PlacesPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<'saved' | 'history'>('saved');

  const isEmpty = activeTab === 'saved' ? MOCK_SAVED_PLACES.length === 0 : MOCK_RECOMMENDATIONS_HISTORY.length === 0;
  const displayItems = activeTab === 'saved' ? MOCK_SAVED_PLACES : MOCK_RECOMMENDATIONS_HISTORY;

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

          {/* Content */}
          <AnimatePresence mode="wait">
            {isEmpty ? (
              <motion.div
                key="empty"
                className="flex flex-col items-center justify-center py-16"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                <div className="w-32 h-32 md:w-40 md:h-40 mb-6">
                  <TotoroSavedPlaces />
                </div>
                <h2 className="font-display text-2xl text-foreground text-center mb-2">
                  {activeTab === 'saved' ? t('places.noSaved') : t('places.noHistory')}
                </h2>
                <p className="font-body text-sm text-muted-foreground text-center max-w-sm">
                  {activeTab === 'saved'
                    ? t('places.noSavedDesc')
                    : t('places.noHistoryDesc')}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                className="flex flex-col gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {displayItems.map((place, index) => (
                  <motion.div
                    key={place.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PlaceCard
                      name={place.name}
                      address={place.address}
                      reasoning={place.reasoning}
                      source={place.source}
                      cuisine={place.cuisine}
                      priceRange={place.priceRange}
                      onSelect={() => {
                        // Handle place selection
                        console.log('Selected:', place.name);
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
