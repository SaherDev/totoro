import { z } from 'zod';

// Loose schema — only validates that places is an array; onResponse does normalization
export const SaveExtractPlaceSchema = z.record(z.string(), z.unknown());

export const ExtractPlaceDataSchema = z.object({
  places: z.array(SaveExtractPlaceSchema),
}).passthrough();

export type ExtractPlaceDataType = z.infer<typeof ExtractPlaceDataSchema>;
