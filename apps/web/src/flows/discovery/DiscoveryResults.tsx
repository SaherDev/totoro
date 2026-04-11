'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaceAvatar } from '@/components/PlaceAvatar';
import type { HomeStoreApi } from '@/store/home-store';

interface DiscoveryPlace {
  place_id: string;
  place_name: string;
  cuisine?: string;
  price_range?: string;
  address: string;
}

interface DiscoveryResultsProps {
  places: DiscoveryPlace[];
  query: string;
  store: HomeStoreApi;
}

function DiscoveryCard({ place, index, store }: { place: DiscoveryPlace; index: number; store: HomeStoreApi }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (saved) return;
    setSaved(true);
    store.saveQuiet({
      place_id: place.place_id,
      place_name: place.place_name,
      cuisine: place.cuisine ?? null,
      price_range: place.price_range ?? null,
      address: place.address,
      confidence: 0.95,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
    >
      <PlaceAvatar name={place.place_name} size={48} className="rounded-lg overflow-hidden" />

      {/* Place info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm truncate">{place.place_name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {place.cuisine && `${place.cuisine} • `}
          {place.price_range && `${place.price_range} • `}
          {place.address}
        </p>
      </div>

      {/* Save button — toggles inline */}
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
            Saved
          </motion.div>
        ) : (
          <motion.button
            key="save"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="flex-shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            + Save
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function DiscoveryResults({ places, query, store }: DiscoveryResultsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">{query}</h2>
        <p className="text-xs text-muted-foreground mt-1">One tap to save. Real places.</p>
      </div>

      {/* Results list */}
      <div className="space-y-2">
        <AnimatePresence>
          {places.map((place, idx) => (
            <DiscoveryCard
              key={place.place_id}
              place={place}
              index={idx}
              store={store}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {places.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-6"
        >
          <p className="text-sm text-muted-foreground">No results found</p>
        </motion.div>
      )}
    </div>
  );
}
