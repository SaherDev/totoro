'use client';

import { motion, AnimatePresence } from 'framer-motion';
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

function DiscoveryCard({ place, index, onSave }: { place: DiscoveryPlace; index: number; onSave: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
    >
      {/* Thumbnail placeholder */}
      <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted" />

      {/* Place info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm truncate">{place.place_name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {place.cuisine && `${place.cuisine} • `}
          {place.price_range && `${place.price_range} • `}
          {place.address}
        </p>
      </div>

      {/* Save button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSave}
        className="flex-shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        + Save
      </motion.button>
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
              onSave={() => store.openSaveSheet(place.place_name, [
                {
                  place_id: place.place_id,
                  place_name: place.place_name,
                  cuisine: place.cuisine ?? null,
                  price_range: place.price_range ?? null,
                  address: place.address,
                  confidence: 0.95,
                }
              ])}
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
