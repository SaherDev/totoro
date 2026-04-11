import type { ChatRequestDto, ChatResponseDto, ExtractPlaceData } from '@totoro/shared';

export async function saveFixture(req: ChatRequestDto): Promise<ChatResponseDto> {
  const { message } = req;

  // Keyed fixtures by exact match
  if (message === 'tiktok.com/@foodie/ramen123') {
    const data: ExtractPlaceData = {
      places: [
        {
          place_id: 'place-1',
          place_name: 'Fuji Ramen Bangkok',
          address: '123 Sukhumvit Soi 33, Bangkok',
          cuisine: 'ramen',
          price_range: 'low',
          confidence: 0.92,
          status: 'resolved',
        },
        {
          place_id: 'place-1b',
          place_name: 'Fuji Ramen Siam',
          address: '456 Rama I Rd, Bangkok',
          cuisine: 'ramen',
          price_range: 'low',
          confidence: 0.87,
          status: 'resolved',
        },
      ],
      requires_confirmation: false,
      source_url: 'https://www.tiktok.com/@foodie/ramen123',
    };
    return { type: 'extract-place', message: '', data };
  }

  if (message === 'Paste Bangkok restaurant') {
    const data: ExtractPlaceData = {
      places: [
        {
          place_id: 'place-2',
          place_name: 'Paste Restaurant',
          address: '69 Sukhumvit Soi 49, Bangkok',
          cuisine: 'thai',
          price_range: 'medium',
          confidence: 0.78,
          status: 'resolved',
        },
        {
          place_id: 'place-2b',
          place_name: 'Paste Seasonal Cuisine',
          address: '125 Sukhumvit Soi 25, Bangkok',
          cuisine: 'thai',
          price_range: 'medium',
          confidence: 0.72,
          status: 'resolved',
        },
      ],
      requires_confirmation: false,
      source_url: null,
    };
    return { type: 'extract-place', message: '', data };
  }

  if (message === 'Fuji Ramen Bangkok') {
    const data: ExtractPlaceData = {
      places: [
        {
          place_id: 'place-1',
          place_name: 'Fuji Ramen Bangkok',
          address: '123 Sukhumvit Soi 33, Bangkok',
          cuisine: 'ramen',
          price_range: 'low',
          confidence: 0.99,
          status: 'duplicate',
          original_saved_at: '2026-02-12T14:30:00Z',
        },
      ],
      requires_confirmation: false,
      source_url: null,
    };
    return { type: 'extract-place', message: '', data };
  }

  // Unknown — low confidence, requires confirmation
  const data: ExtractPlaceData = {
    places: [
      {
        place_id: null,
        place_name: null,
        address: null,
        cuisine: null,
        price_range: null,
        confidence: 0.35,
        status: 'unresolved',
      },
    ],
    requires_confirmation: true,
    source_url: null,
  };
  return { type: 'extract-place', message: '', data };
}
