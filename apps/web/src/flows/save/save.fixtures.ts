import type { ChatResponseDto, PlaceObject, ExtractPlaceData } from '@totoro/shared';
import type { ChatClientOptions } from '../../lib/chat-client';

const makeSavedPlace = (
  overrides: Pick<PlaceObject, 'place_id' | 'place_name' | 'subcategory' | 'tags' | 'attributes'>,
): PlaceObject => ({
  ...overrides,
  place_type: 'food_and_drink',
  source_url: null,
  source: 'manual',
  provider_id: null,
  created_at: null,
  lat: null,
  lng: null,
  address: null,
  geo_fresh: false,
  hours: null,
  rating: null,
  phone: null,
  photo_url: null,
  popularity: null,
  enriched: false,
});

const SUSHI_SORA = makeSavedPlace({
  place_id: 'pl_sushi_sora_bkk',
  place_name: 'Sushi Sora Bangkok',
  subcategory: 'restaurant',
  tags: ['omakase', 'sukhumvit', 'special_occasion'],
  attributes: {
    cuisine: 'omakase',
    price_hint: '$$$',
    ambiance: 'upscale',
    dietary: [],
    good_for: ['special_occasion', 'date_night'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
});

const ROOTS_COFFEE = makeSavedPlace({
  place_id: 'pl_roots_coffee',
  place_name: 'Roots Coffee Roaster',
  subcategory: 'cafe',
  tags: ['coffee', 'specialty', 'work_friendly'],
  attributes: {
    cuisine: 'cafe',
    price_hint: '$',
    ambiance: 'cozy',
    dietary: ['vegan_option'],
    good_for: ['solo', 'work'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
});

const PACAMARA = makeSavedPlace({
  place_id: 'pl_pacamara',
  place_name: 'Pacamara Boutique Coffee',
  subcategory: 'cafe',
  tags: ['coffee', 'boutique', 'pour_over'],
  attributes: {
    cuisine: 'cafe',
    price_hint: '$',
    ambiance: 'quiet',
    dietary: [],
    good_for: ['solo'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
});

function makeResponse(data: ExtractPlaceData, message: string): ChatResponseDto {
  return { type: 'extract-place', message, data, tool_calls_used: 1 };
}

export async function saveFixture(req: ChatClientOptions): Promise<ChatResponseDto> {
  const { message } = req;
  const lower = message.toLowerCase();

  if (lower.includes('sushi sora')) {
    return makeResponse(
      {
        results: [{ place: SUSHI_SORA, confidence: 0.94, status: 'saved' }],
        source_url: null,
        request_id: null,
      },
      'Saved: Sushi Sora Bangkok',
    );
  }

  if (message.includes('tiktok.com') || message.includes('instagram.com')) {
    return makeResponse(
      {
        results: [{ place: { ...SUSHI_SORA, place_id: 'pl_sushi_sora_url', source: 'tiktok' }, confidence: 0.91, status: 'saved' }],
        source_url: message,
        request_id: null,
      },
      'Saved from link: Sushi Sora Bangkok',
    );
  }

  if (lower.includes('coffee') || lower.includes('cafe')) {
    return makeResponse(
      {
        results: [
          { place: ROOTS_COFFEE, confidence: 0.62, status: 'needs_review' },
          { place: PACAMARA, confidence: 0.55, status: 'needs_review' },
        ],
        source_url: null,
        request_id: null,
      },
      "I found 2 places — please confirm which ones to save",
    );
  }

  // Default — pending
  return makeResponse(
    {
      results: [{ place: null, confidence: null, status: 'pending' }],
      source_url: null,
      request_id: 'req_fixture_pending',
    },
    "I'm processing this, one moment…",
  );
}
