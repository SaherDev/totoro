import type { ChatResponseDto, ExtractPlaceData } from '@totoro/shared';
import type { ChatClientOptions } from '../../lib/chat-client';

export async function saveFixture(req: ChatClientOptions): Promise<ChatResponseDto> {
  const { message } = req;

  // High confidence — auto-save
  if (message.toLowerCase().includes('sushi sora')) {
    const data: ExtractPlaceData = {
      places: [
        {
          place_id: 'place-sushi-sora-bkk',
          place_name: 'Sushi Sora Bangkok',
          address: 'Sukhumvit Soi 26, Khlong Toei, Bangkok 10110',
          cuisine: 'omakase',
          price_range: 'high',
          confidence: 0.94,
          status: 'resolved',
        },
      ],
      requires_confirmation: false,
      source_url: null,
    };
    return { type: 'extract-place', message: '', data };
  }

  // TikTok URL — high confidence, auto-save
  if (message.includes('tiktok.com')) {
    const data: ExtractPlaceData = {
      places: [
        {
          place_id: 'place-sushi-sora-bkk',
          place_name: 'Sushi Sora Bangkok',
          address: 'Sukhumvit Soi 26, Khlong Toei, Bangkok 10110',
          cuisine: 'omakase',
          price_range: 'high',
          confidence: 0.91,
          status: 'resolved',
        },
      ],
      requires_confirmation: false,
      source_url: message,
    };
    return { type: 'extract-place', message: '', data };
  }

  // Below threshold — show confirmation list
  if (message.toLowerCase().includes('coffee') || message.toLowerCase().includes('cafe')) {
    const data: ExtractPlaceData = {
      places: [
        {
          place_id: 'place-cafe-1',
          place_name: 'Roots Coffee Roaster',
          address: '34/1 Sukhumvit Soi 26, Khlong Toei, Bangkok',
          cuisine: 'cafe',
          price_range: 'low',
          confidence: 0.62,
          status: 'resolved',
        },
        {
          place_id: 'place-cafe-2',
          place_name: 'Pacamara Boutique Coffee',
          address: '39 Sukhumvit Soi 31, Watthana, Bangkok',
          cuisine: 'cafe',
          price_range: 'low',
          confidence: 0.55,
          status: 'resolved',
        },
      ],
      requires_confirmation: true,
      source_url: null,
    };
    return { type: 'extract-place', message: '', data };
  }

  // Default — low confidence, requires confirmation
  const data: ExtractPlaceData = {
    places: [
      {
        place_id: null,
        place_name: message,
        address: null,
        cuisine: null,
        price_range: null,
        confidence: 0.45,
        status: 'unresolved',
      },
    ],
    requires_confirmation: true,
    source_url: null,
  };
  return { type: 'extract-place', message: '', data };
}
