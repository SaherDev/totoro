import type { ChatResponseDto } from '@totoro/shared';
import type { ChatClientOptions } from '../../lib/chat-client';

export async function recallFixture(req: ChatClientOptions): Promise<ChatResponseDto> {
  const { message } = req;

  // Keyed fixtures by exact match
  if (message === 'that ramen place from TikTok') {
    return {
      type: 'recall',
      message: '',
      data: {
        results: [
          {
            place_id: '1',
            place_name: 'Fuji Ramen',
            address: '123 Sukhumvit Soi 33, Bangkok',
            cuisine: 'ramen',
            price_range: 'low',
            source_url: 'https://www.tiktok.com/@foodie/video/123',
            saved_at: '2026-02-12T14:30:00Z',
            match_reason: 'Saved from TikTok, tagged ramen',
            thumbnail_url: undefined,
          },
          {
            place_id: '2',
            place_name: 'Bankara Ramen',
            address: '456 Sukhumvit Soi 39, Bangkok',
            cuisine: 'ramen',
            price_range: 'medium',
            source_url: null,
            saved_at: '2026-02-05T10:15:00Z',
            match_reason: 'Ramen with tonkotsu broth',
            thumbnail_url: undefined,
          },
        ],
        total: 2,
        has_more: true,
      },
    };
  }

  if (message === 'the cafe near Sukhumvit') {
    return {
      type: 'recall',
      message: '',
      data: {
        results: [
          {
            place_id: '3',
            place_name: 'The Nook Cafe',
            address: '789 Sukhumvit Soi 19, Bangkok',
            cuisine: 'coffee',
            price_range: 'medium',
            source_url: null,
            saved_at: '2026-01-28T09:45:00Z',
            match_reason: 'Cozy cafe with good coffee',
            thumbnail_url: undefined,
          },
          {
            place_id: '4',
            place_name: 'Brew & Bean',
            address: '100 Sukhumvit Soi 26, Bangkok',
            cuisine: 'coffee',
            price_range: 'medium',
            source_url: 'https://www.instagram.com/brewbean/',
            saved_at: '2026-02-01T11:20:00Z',
            match_reason: 'Saved from Instagram',
            thumbnail_url: undefined,
          },
          {
            place_id: '5',
            place_name: 'Caffeine Corner',
            address: '200 Sukhumvit Soi 12, Bangkok',
            cuisine: 'coffee',
            price_range: 'low',
            source_url: null,
            saved_at: '2026-01-15T08:00:00Z',
            match_reason: 'Affordable local spot',
            thumbnail_url: undefined,
          },
        ],
        total: 3,
        has_more: false,
      },
    };
  }

  if (message === 'Japanese spot in Tokyo') {
    return {
      type: 'recall',
      message: '',
      data: {
        results: [
          {
            place_id: '6',
            place_name: 'Sushi Masako',
            address: '1-2-3 Ginza, Tokyo',
            cuisine: 'sushi',
            price_range: 'high',
            source_url: null,
            saved_at: '2026-01-20T16:30:00Z',
            match_reason: 'High-end sushi experience',
            thumbnail_url: undefined,
          },
        ],
        total: 1,
        has_more: true,
      },
    };
  }

  // Unknown query — empty results
  return {
    type: 'recall',
    message: '',
    data: {
      results: [],
      total: 0,
      has_more: false,
    },
  };
}
