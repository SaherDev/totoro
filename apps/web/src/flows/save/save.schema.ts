import { z } from 'zod';

export const SaveExtractPlaceSchema = z.object({
  place_id: z.string().nullable(),
  place_name: z.string().nullable(),
  address: z.string().nullable(),
  cuisine: z.string().nullable(),
  price_range: z.string().nullable(),
  thumbnail_url: z.string().optional(),
  confidence: z.number().optional(),
  status: z.enum(['resolved', 'duplicate', 'unresolved']).optional(),
  original_saved_at: z.string().optional(),
});

export const ExtractPlaceDataSchema = z.object({
  places: z.array(SaveExtractPlaceSchema),
  requires_confirmation: z.boolean(),
  source_url: z.string().nullable(),
});

export type ExtractPlaceDataType = z.infer<typeof ExtractPlaceDataSchema>;
