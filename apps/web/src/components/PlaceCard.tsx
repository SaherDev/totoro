'use client';

import { useState, useCallback } from 'react';
import { MapPin, Star, Phone, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PlaceObject } from '@totoro/shared';
import { PlaceAvatar } from '@/components/PlaceAvatar';
import { cn } from '@totoro/ui';

// ── Tag pill ──────────────────────────────────────────────────────────────────

function TagPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
      {label}
    </span>
  );
}

// ── Rating stars ──────────────────────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-3 w-3',
              i < full ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30',
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

// ── PlaceCard ─────────────────────────────────────────────────────────────────

export interface PlaceCardProps {
  place: PlaceObject;
  /** Controlled expanded state */
  expanded?: boolean;
  /** Uncontrolled default */
  defaultExpanded?: boolean;
  onToggle?: (next: boolean) => void;
  /** Top-end corner badge (source, confidence, match-reason, etc.) */
  badge?: React.ReactNode;
  /** Bottom action row (accept/reject, confirm, etc.) */
  action?: React.ReactNode;
  className?: string;
}

export function PlaceCard({
  place,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onToggle,
  badge,
  action,
  className,
}: PlaceCardProps) {
  const t = useTranslations('placeCard');
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;
  const [imgLoaded, setImgLoaded] = useState(false);
  const handleImgLoad = useCallback(() => setImgLoaded(true), []);

  function toggle() {
    const next = !expanded;
    if (!isControlled) setInternalExpanded(next);
    onToggle?.(next);
  }

  const showTier2 = place.geo_fresh || place.lat != null;
  const showTier3 = place.enriched;

  // Strip provider namespace prefix: "google:ChIJ..." → "ChIJ..."
  const mapsUrl = place.provider_id
    ? (() => {
        const rawId = place.provider_id.includes(':')
          ? place.provider_id.split(':').slice(1).join(':')
          : place.provider_id;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place_name)}&query_place_id=${encodeURIComponent(rawId)}`;
      })()
    : null;

  // Resolve today's hours
  const todayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date().getDay()
  ] as keyof typeof place.hours;
  const todayHours = place.hours?.[todayKey] ?? null;

  return (
    <article className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-sm', className)}>
      {/* Collapsed header — always visible, minimal text row */}
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 focus:outline-none"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? t('collapse') : t('expand')}
      >
        <div className="flex min-w-0 flex-col gap-0.5 text-start">
          <h3 className="truncate text-sm font-semibold text-foreground">{place.place_name}</h3>
          {(place.subcategory ?? place.attributes.cuisine) && (
            <p className="truncate text-[11px] text-muted-foreground">
              {[place.subcategory ?? place.attributes.cuisine, place.attributes.price_hint]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          <div className="rounded-full border border-border p-1">
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded body — CSS grid trick: 0fr→1fr is the smoothest height animation */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
            {/* Photo / avatar — only shown when expanded */}
            {place.photo_url ? (
              <div className="relative h-40 w-full overflow-hidden bg-muted/40">
                {/* Skeleton shown until image loads */}
                {!imgLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-muted/60" />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={place.photo_url}
                  alt={place.place_name}
                  loading="lazy"
                  decoding="async"
                  onLoad={handleImgLoad}
                  className={cn(
                    'h-40 w-full object-cover transition-opacity duration-300',
                    imgLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </div>
            ) : (
              <div className="flex h-32 w-full items-center justify-center bg-muted/50">
                <PlaceAvatar name={place.place_name} size={96} />
              </div>
            )}

            <div className="flex flex-col gap-3 p-4">
              {/* Tags */}
              {place.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {place.tags.map((tag) => (
                    <TagPill key={tag} label={tag} />
                  ))}
                </div>
              )}

              {/* Tier 1 attributes */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {place.attributes.cuisine && (
                  <p className="text-muted-foreground">
                    Cuisine{' '}
                    <span className="font-medium text-foreground">{place.attributes.cuisine}</span>
                  </p>
                )}
                {place.attributes.ambiance && (
                  <p className="text-muted-foreground">
                    Vibe{' '}
                    <span className="font-medium text-foreground">{place.attributes.ambiance}</span>
                  </p>
                )}
                {place.attributes.dietary.length > 0 && (
                  <p className="col-span-2 text-muted-foreground">
                    Dietary{' '}
                    <span className="font-medium text-foreground">
                      {place.attributes.dietary.join(', ')}
                    </span>
                  </p>
                )}
                {place.attributes.good_for.length > 0 && (
                  <p className="col-span-2 text-muted-foreground">
                    Good for{' '}
                    <span className="font-medium text-foreground">
                      {place.attributes.good_for.join(', ')}
                    </span>
                  </p>
                )}
                {place.attributes.location_context && (
                  <p className="col-span-2 text-muted-foreground">
                    {[
                      place.attributes.location_context.neighborhood,
                      place.attributes.location_context.city,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>

              {/* Tier 2 — address */}
              {showTier2 && place.address && (
                <p className="text-sm text-muted-foreground">{place.address}</p>
              )}

              {/* Tier 3 — enrichment */}
              {showTier3 && (
                <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3">
                  {place.rating != null && <RatingStars rating={place.rating} />}
                  {todayHours && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{todayHours}</span>
                    </div>
                  )}
                  {place.phone && (
                    <a
                      href={`tel:${place.phone}`}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>{place.phone}</span>
                    </a>
                  )}
                  {place.popularity != null && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Popularity</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round(place.popularity * 100)}%` }}
                        />
                      </div>
                      <span>{Math.round(place.popularity * 100)}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Map button + action slot */}
              {(mapsUrl || action) && (
                <div className="flex flex-wrap items-center gap-2">
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {t('openMap')}
                    </a>
                  )}
                  {action}
                </div>
              )}
            </div>
        </div>
      </div>
    </article>
  );
}
