import { z } from 'zod';

/**
 * Geographic coordinates in WGS 84 decimal degrees.
 * `lat` ∈ [-90, 90], `lng` ∈ [-180, 180].
 *
 * The frontend may legitimately have no location (user denied the
 * permission prompt, geolocation API unavailable, or the browser threw).
 * All contracts that carry a location therefore use `Location | null`.
 */
export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const LocationOrNullSchema = LocationSchema.nullable();

export type Location = z.infer<typeof LocationSchema>;
