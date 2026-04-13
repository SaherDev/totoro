'use client';

import { useEffect } from 'react';
import { LocationSchema, type Location } from '@totoro/shared';
import { useLocationStore } from '../store/locationStore';

/**
 * Geolocation provider protocol — ADR-033 / ADR-038.
 *
 * Any concrete implementation that can resolve a `Location | null`
 * satisfies this interface. The browser provider is the default, but
 * tests, server-rendering fallbacks, or alternative transports can
 * supply their own implementation by passing it to `useGeolocation`.
 */
export interface GeolocationProvider {
  /**
   * Resolve a location or `null`. MUST NOT reject — provider
   * implementations translate every failure mode (denied permission,
   * API unavailable, timeout, unknown error) into `null`.
   */
  getCurrentPosition(): Promise<Location | null>;
}

/**
 * Default browser implementation of {@link GeolocationProvider}.
 * Wraps `navigator.geolocation.getCurrentPosition` and normalises every
 * failure (including "API not available") into `null`.
 */
export class BrowserGeolocationProvider implements GeolocationProvider {
  async getCurrentPosition(): Promise<Location | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return new Promise<Location | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const parsed = LocationSchema.safeParse({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          resolve(parsed.success ? parsed.data : null);
        },
        () => resolve(null),
      );
    });
  }
}

const defaultProvider: GeolocationProvider = new BrowserGeolocationProvider();

/**
 * Request the user's current position exactly once per mount and push
 * the result (or `null`) into the in-memory location store.
 *
 * The store is the single source of truth; this hook is the sole
 * writer. Call sites should read `useLocationStore` (or
 * `getLocationSnapshot` from non-React code) instead of invoking the
 * provider themselves.
 *
 * @param provider - Optional override for tests or non-browser runtimes.
 */
export function useGeolocation(provider: GeolocationProvider = defaultProvider): void {
  const resolved = useLocationStore((state) => state.resolved);
  const setLocation = useLocationStore((state) => state.setLocation);

  useEffect(() => {
    if (resolved) return;

    let cancelled = false;
    provider.getCurrentPosition().then((location) => {
      if (!cancelled) setLocation(location);
    });

    return () => {
      cancelled = true;
    };
  }, [provider, resolved, setLocation]);
}
