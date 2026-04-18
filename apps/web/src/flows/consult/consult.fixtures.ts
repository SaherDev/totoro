import type { ChatResponseDto, PlaceObject } from '@totoro/shared';
import type { ChatClientOptions } from '../../lib/chat-client';

const FUJI_RAMEN: PlaceObject = {
  place_id: 'pl_fuji_ramen',
  place_name: 'Fuji Ramen',
  place_type: 'food_and_drink',
  subcategory: 'restaurant',
  tags: ['ramen', 'date_night', 'quiet'],
  attributes: {
    cuisine: 'japanese',
    price_hint: '$$',
    ambiance: 'casual',
    dietary: ['vegetarian_option'],
    good_for: ['date_night', 'solo'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
  source_url: null,
  source: 'manual',
  provider_id: 'google:ChIJN1t_tDeuEmsRUsoyG83frY4',
  created_at: '2026-01-10T08:00:00Z',
  lat: 13.731,
  lng: 100.561,
  address: '123 Sukhumvit Soi 33, Bangkok 10110',
  geo_fresh: true,
  hours: { monday: '11:00–22:00', tuesday: '11:00–22:00', wednesday: '11:00–22:00', thursday: '11:00–22:00', friday: '11:00–23:00', saturday: '11:00–23:00', sunday: '12:00–21:00', timezone: 'Asia/Bangkok' },
  rating: 4.7,
  phone: '+66 2 123 4567',
  photo_url: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=400&fit=crop',
  popularity: 0.85,
  enriched: true,
};

const BANKARA_RAMEN: PlaceObject = {
  place_id: 'pl_bankara_ramen',
  place_name: 'Bankara Ramen',
  place_type: 'food_and_drink',
  subcategory: 'restaurant',
  tags: ['ramen', 'tonkotsu', 'bold'],
  attributes: {
    cuisine: 'japanese',
    price_hint: '$$',
    ambiance: 'lively',
    dietary: [],
    good_for: ['groups', 'quick_meal'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
  source_url: null,
  source: null,
  provider_id: 'google:ChIJbankara123456789',
  created_at: null,
  lat: 13.722,
  lng: 100.567,
  address: '456 Sukhumvit Soi 39, Bangkok 10110',
  geo_fresh: true,
  hours: { monday: '11:30–22:00', timezone: 'Asia/Bangkok' },
  rating: 4.4,
  phone: null,
  photo_url: null,
  popularity: 0.71,
  enriched: true,
};

const IPPUDO: PlaceObject = {
  place_id: 'pl_ippudo_bkk',
  place_name: 'Ippudo Bangkok',
  place_type: 'food_and_drink',
  subcategory: 'restaurant',
  tags: ['ramen', 'hakata', 'chain'],
  attributes: {
    cuisine: 'japanese',
    price_hint: '$$$',
    ambiance: 'upscale',
    dietary: [],
    good_for: ['date_night', 'special_occasion'],
    location_context: { neighborhood: 'Sukhumvit', city: 'Bangkok', country: 'TH' },
  },
  source_url: null,
  source: null,
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
};

export async function consultFixture(_req: ChatClientOptions): Promise<ChatResponseDto> {
  await new Promise((r) => setTimeout(r, 800));
  return {
    type: 'consult',
    message: 'Based on your taste — Fuji Ramen is your best match tonight.',
    data: {
      recommendation_id: 'rec_01HZ_fixture',
      results: [
        { place: FUJI_RAMEN, source: 'saved' },
        { place: BANKARA_RAMEN, source: 'discovered' },
        { place: IPPUDO, source: 'discovered' },
      ],
      reasoning_steps: [
        { step: 'intent_parsing', summary: 'Parsed: cuisine=ramen, occasion=date night, area=Sukhumvit' },
        { step: 'retrieval', summary: 'Found 3 saved ramen places near Sukhumvit' },
        { step: 'discovery', summary: 'Searching 38 restaurants within 1.2 km' },
        { step: 'ranking', summary: 'Ranked 8 candidates by taste fit and distance' },
        { step: 'completion', summary: 'Found your match' },
      ],
    },
  };
}
