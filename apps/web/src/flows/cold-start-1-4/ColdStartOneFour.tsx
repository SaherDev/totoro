'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Illustration } from '@/components/illustrations/Illustration';
import { PlaceAvatar } from '@/components/PlaceAvatar';
import { getSavedPlaces } from '@/storage/saved-places-storage';
import type { HomeStoreApi } from '@/store/home-store';

interface ColdStartOneFourProps {
  store: HomeStoreApi;
}

const DUMMY_DISCOVERY = [
  { place_id: '1', place_name: 'Samlor Restaurant', cuisine: 'Thai', price_range: '$$', address: 'Silom' },
  { place_id: '2', place_name: 'Fuji Ramen', cuisine: 'Ramen', price_range: '$', address: 'Sukhumvit' },
  { place_id: '3', place_name: 'Roots Coffee', cuisine: 'Coffee', price_range: '$', address: 'Ekamai' },
  { place_id: '4', place_name: 'Paste Bangkok', cuisine: 'Fine Thai', price_range: '$$$', address: 'Sathorn' },
  { place_id: '5', place_name: 'Laab Ubol', cuisine: 'Isaan', price_range: '$', address: 'Ratchathewi' },
];

const NEARBY_FEATURE = {
  place_name: 'Samlor Restaurant',
  tags: 'Thai · $$ · 0.4 km · Open now',
  hint: 'Save more places to get picks matched to your taste',
};

export function ColdStartOneFour({ store }: ColdStartOneFourProps) {
  const t = useTranslations('coldStartOneFour');
  const savedPlaces = getSavedPlaces().slice(0, 3);

  return (
    <div className="flex flex-col gap-4 py-4 w-full">

      {/* Totoro message bubble */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-9 w-9 rounded-full overflow-hidden">
          <Illustration id="encouraging" />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 max-w-[85%]">
          <p className="text-sm font-semibold text-foreground">{t('headline')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('subline')}</p>
        </div>
      </div>

      {/* Saved places list */}
      {savedPlaces.length > 0 && (
        <div className="space-y-2">
          {savedPlaces.map((place, idx) => (
            <motion.div
              key={place.place_id ?? idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <PlaceAvatar name={place.place_name} size={44} className="rounded-lg overflow-hidden" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{place.place_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {place.source_url ? (() => { try { return new URL(place.source_url!).hostname.replace('www.', ''); } catch { return 'Saved'; } })() : 'Saved'} · {place.address || 'Bangkok'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* What's good nearby */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
          {t('whatGoodNearby')}
        </p>
        <div className="rounded-2xl border border-dashed border-accent/60 bg-accent/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-accent mb-1">
            {t('popularRightNow')}
          </p>
          <p className="font-semibold text-foreground text-sm">{NEARBY_FEATURE.place_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{NEARBY_FEATURE.tags}</p>
          <p className="text-xs text-muted-foreground/70 italic mt-1.5">{NEARBY_FEATURE.hint}</p>
        </div>
      </div>

      {/* Bottom action pill — two sections in one pill */}
      <div className="flex items-center rounded-full border border-border bg-card overflow-hidden">
        <button
          onClick={() => store.submit('recall a saved place')}
          className="flex-1 px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition-colors text-start"
        >
          {t('alreadySaved')}
        </button>
        <div className="w-px h-6 bg-border flex-shrink-0" />
        <button
          onClick={() => store.setDiscoveryResults(DUMMY_DISCOVERY, "What's good in Bangkok")}
          className="flex-1 px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors text-end"
        >
          {t('starterPackLink')}
        </button>
      </div>

    </div>
  );
}
