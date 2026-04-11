'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Illustration } from '@/components/illustrations/Illustration';
import type { HomeStoreApi } from '@/store/home-store';

interface ColdStartOneFourProps {
  store: HomeStoreApi;
}

export function ColdStartOneFour({ store }: ColdStartOneFourProps) {
  const t = useTranslations('coldStartOneFour');

  // Popular places — clicking sends a realistic save message to the API
  const popularPlaces = [
    {
      label: 'Sushi Sora Bangkok',
      area: 'Sukhumvit · Omakase',
      message: '📍Sushi Sora Bangkok Sukhumvit amazing omakase, I only eat omakase',
    },
    {
      label: 'Roots Coffee Roaster',
      area: 'Ekamai · Specialty coffee',
      message: '📍Roots Coffee Roaster Ekamai Bangkok best single origin coffee',
    },
  ];

  // Dummy discovery data for city starter pack
  const dummyDiscoveryPlaces = [
    {
      place_id: '1',
      place_name: 'Samlor Restaurant',
      cuisine: 'Thai',
      price_range: '$$',
      address: 'Silom',
    },
    {
      place_id: '2',
      place_name: 'Fuji Ramen',
      cuisine: 'Ramen',
      price_range: '$',
      address: 'Sukhumvit',
    },
    {
      place_id: '3',
      place_name: 'Roots Coffee',
      cuisine: 'Coffee',
      price_range: '$',
      address: 'Ekamai',
    },
    {
      place_id: '4',
      place_name: 'Paste Bangkok',
      cuisine: 'Fine Thai',
      price_range: '$$$',
      address: 'Sathorn',
    },
    {
      place_id: '5',
      place_name: 'Laab Ubol',
      cuisine: 'Isaan',
      price_range: '$',
      address: 'Ratchathewi',
    },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Illustration */}
      <div className="h-32 w-32">
        <Illustration id="encouraging" />
      </div>

      {/* Headline & Subline */}
      <div className="flex flex-col items-center gap-2 text-center max-w-sm">
        <h2 className="text-2xl font-display text-foreground">{t('headline')}</h2>
        <p className="text-sm text-muted-foreground">{t('subline')}</p>
      </div>

      {/* Popular nearby section */}
      <div className="w-full space-y-3 max-w-sm">
        <div className="flex items-center justify-between px-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">{t('popularLabel')}</p>
        </div>
        <div className="space-y-2 px-4">
          {popularPlaces.map((place, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => store.submit(place.message)}
              className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-start text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <p className="font-medium">{place.label}</p>
              <p className="text-xs text-muted-foreground">{place.area}</p>
            </motion.button>
          ))}
        </div>

        {/* Starter pack link */}
        <button
          onClick={() => store.setDiscoveryResults(dummyDiscoveryPlaces, "What's good in Bangkok")}
          className="w-full rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          {t('starterPackLink')}
        </button>
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center max-w-sm px-4">{t('popularFootnote')}</p>
    </div>
  );
}
