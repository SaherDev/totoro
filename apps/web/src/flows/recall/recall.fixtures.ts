import type { ChatResponseDto, PlaceObject, RecallResponseData } from '@totoro/shared';
import type { ChatClientOptions } from '../../lib/chat-client';

const makeTier1Place = (
  overrides: Pick<PlaceObject, 'place_id' | 'place_name' | 'subcategory' | 'tags' | 'attributes'>,
): PlaceObject => ({
  ...overrides,
  place_type: 'food_and_drink',
  source_url: null,
  source: null,
  provider_id: null,
  created_at: '2026-02-12T14:30:00Z',
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

const FUJI_RAMEN = makeTier1Place({
  place_id: 'pl_fuji_ramen_recall',
  place_name: 'Fuji Ramen',
  subcategory: 'restaurant',
  tags: ['ramen', 'tiktok_save', 'late_night'],
  attributes: {
    cuisine: 'japanese',
    price_hint: '$$',
    ambiance: 'casual',
    dietary: [],
    good_for: ['solo', 'quick_meal'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
});

const BANKARA_RAMEN = makeTier1Place({
  place_id: 'pl_bankara_recall',
  place_name: 'Bankara Ramen',
  subcategory: 'restaurant',
  tags: ['ramen', 'tonkotsu'],
  attributes: {
    cuisine: 'japanese',
    price_hint: '$$',
    ambiance: 'lively',
    dietary: [],
    good_for: ['groups'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
});

const NOOK_CAFE = makeTier1Place({
  place_id: 'pl_nook_cafe',
  place_name: 'The Nook Cafe',
  subcategory: 'cafe',
  tags: ['coffee', 'cozy', 'work_friendly'],
  attributes: {
    cuisine: 'cafe',
    price_hint: '$',
    ambiance: 'cozy',
    dietary: ['vegan_option'],
    good_for: ['solo', 'work'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
});

const BREW_AND_BEAN = makeTier1Place({
  place_id: 'pl_brew_bean',
  place_name: 'Brew & Bean',
  subcategory: 'cafe',
  tags: ['coffee', 'instagram_save'],
  attributes: {
    cuisine: 'cafe',
    price_hint: '$$',
    ambiance: 'trendy',
    dietary: [],
    good_for: ['date_night', 'photos'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
});

const SUSHI_MASAKO = makeTier1Place({
  place_id: 'pl_sushi_masako',
  place_name: 'Sushi Masako',
  subcategory: 'restaurant',
  tags: ['sushi', 'omakase', 'tokyo'],
  attributes: {
    cuisine: 'japanese',
    price_hint: '$$$',
    ambiance: 'upscale',
    dietary: [],
    good_for: ['special_occasion', 'date_night'],
    location_context: { neighborhood: 'Ginza', city: 'Tokyo', country: 'JP' },
  },
});

function makeResponse(data: RecallResponseData, message: string): ChatResponseDto {
  return { type: 'recall', message, data };
}

export async function recallFixture(req: ChatClientOptions): Promise<ChatResponseDto> {
  const { message } = req;
  const lower = message.toLowerCase();

  if (lower.includes('ramen')) {
    return makeResponse(
      {
        results: [
          { place: FUJI_RAMEN, match_reason: 'semantic + keyword', relevance_score: 0.021, score_type: 'rrf' },
          { place: BANKARA_RAMEN, match_reason: 'semantic', relevance_score: 0.014, score_type: 'rrf' },
        ],
        total_count: 2,
        empty_state: false,
      },
      'Found 2 ramen places in your saves',
    );
  }

  if (lower.includes('cafe') || lower.includes('coffee')) {
    return makeResponse(
      {
        results: [
          { place: NOOK_CAFE, match_reason: 'filter', relevance_score: null, score_type: null },
          { place: BREW_AND_BEAN, match_reason: 'keyword', relevance_score: 0.009, score_type: 'rrf' },
        ],
        total_count: 3,
        empty_state: false,
      },
      'Found 3 cafes in your saves — showing 2',
    );
  }

  if (lower.includes('japanese') || lower.includes('sushi')) {
    return makeResponse(
      {
        results: [
          { place: SUSHI_MASAKO, match_reason: 'semantic', relevance_score: 0.018, score_type: 'rrf' },
        ],
        total_count: 1,
        empty_state: false,
      },
      'Found 1 Japanese place in your saves',
    );
  }

  // Empty
  return makeResponse({ results: [], total_count: 0, empty_state: false }, "Nothing found matching that.");
}
