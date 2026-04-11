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

  // Placeholder popular places — normally would come from API
  const popularPlaces = [
    { name: 'Popular Ramen Spot', area: 'Sukhumvit' },
    { name: 'Local Coffee Shop', area: 'Silom' },
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
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-3 px-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">{t('popularLabel')}</p>
        </div>
        <div className="space-y-2">
          {popularPlaces.map((place, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => store.submit(place.name)}
              className="w-full rounded-2xl border border-border bg-muted/50 px-4 py-3 text-start text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <p className="font-medium">{place.name}</p>
              <p className="text-xs text-muted-foreground">{place.area}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Starter pack link */}
      <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
        {t('starterPackLink')}
      </button>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center max-w-sm px-4">{t('popularFootnote')}</p>
    </div>
  );
}
