import type { ChatRequestDto, ChatResponseDto } from '@totoro/shared';
import type { ExtractPlaceData } from '@totoro/shared';

export async function saveFixture(req: ChatRequestDto): Promise<ChatResponseDto> {
  const { message } = req;

  // Keyed fixtures by exact match
  if (message === 'tiktok.com/@foodie/ramen123') {
    const data: ExtractPlaceData = {
      place_id: 'place-1',
      place: {
        place_name: 'Fuji Ramen Bangkok',
        address: '123 Sukhumvit Soi 33, Bangkok',
        cuisine: 'ramen',
        price_range: 'low',
        thumbnail_url: undefined,
      },
      confidence: 0.92,
      status: 'resolved',
      requires_confirmation: false,
      source_url: 'https://www.tiktok.com/@foodie/ramen123',
    };
    return { type: 'extract-place', message: '', data };
  }

  if (message === 'Paste Bangkok restaurant') {
    const data: ExtractPlaceData = {
      place_id: 'place-2',
      place: {
        place_name: 'Paste Restaurant',
        address: '69 Sukhumvit Soi 49, Bangkok',
        cuisine: 'thai',
        price_range: 'medium',
        thumbnail_url: undefined,
      },
      confidence: 0.78,
      status: 'resolved',
      requires_confirmation: false,
      source_url: null,
    };
    return { type: 'extract-place', message: '', data };
  }

  if (message === 'Fuji Ramen Bangkok') {
    const data: ExtractPlaceData = {
      place_id: 'place-1',
      place: {
        place_name: 'Fuji Ramen Bangkok',
        address: '123 Sukhumvit Soi 33, Bangkok',
        cuisine: 'ramen',
        price_range: 'low',
        thumbnail_url: undefined,
      },
      confidence: 0.99,
      status: 'duplicate',
      requires_confirmation: false,
      source_url: null,
      original_saved_at: '2026-02-12T14:30:00Z',
    };
    return { type: 'extract-place', message: '', data };
  }

  // Unknown — low confidence, requires confirmation
  const data: ExtractPlaceData = {
    place_id: null,
    place: {
      place_name: null,
      address: null,
      cuisine: null,
      price_range: null,
      thumbnail_url: undefined,
    },
    confidence: 0.35,
    status: 'resolved',
    requires_confirmation: true,
    source_url: null,
  };
  return { type: 'extract-place', message: '', data };
}
