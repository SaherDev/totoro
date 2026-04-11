'use client';

import type { ChatRequestDto, ChatResponseDto, ConsultResponseData } from '@totoro/shared';
import { classifyIntent } from './classify-intent';

export interface ChatClientOptions {
  message: string;
  userId: string;
  location: { lat: number; lng: number } | null;
  signal?: AbortSignal;
}

export interface ChatClient {
  chat(opts: ChatClientOptions): Promise<ChatResponseDto>;
}

function categorizeError(err: unknown): 'offline' | 'timeout' | 'server' | 'generic' {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (err instanceof Error && err.name === 'AbortError') return 'timeout';
  return 'generic';
}

function makeRealChatClient(getToken: () => Promise<string>): ChatClient {
  return {
    async chat({ message, userId, location, signal }) {
      const token = await getToken();
      const body: ChatRequestDto = {
        user_id: userId,
        message,
        ...(location ? { location } : {}),
      };

      let res: Response;
      try {
        res = await fetch('/api/v1/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          signal,
        });
      } catch (err) {
        const category = categorizeError(err);
        throw Object.assign(new Error(String(err)), { category });
      }

      if (!res.ok) {
        const category = res.status >= 500 ? 'server' : 'generic';
        throw Object.assign(new Error(`HTTP ${res.status}`), { category });
      }

      return res.json() as Promise<ChatResponseDto>;
    },
  };
}

const CONSULT_FIXTURE: ConsultResponseData = {
  primary: {
    place_name: 'Fuji Ramen',
    address: '123 Sukhumvit Soi 33, Bangkok',
    reasoning:
      'Your top-rated ramen spot. 10 minutes from you and perfect for a quiet dinner.',
    source: 'saved',
    photos: { hero: undefined, square: undefined },
  },
  alternatives: [
    {
      place_name: 'Bankara Ramen',
      address: '456 Sukhumvit Soi 39, Bangkok',
      reasoning: 'Rich tonkotsu broth — matches your preference for bold flavours.',
      source: 'discovered',
      photos: { square: undefined },
    },
    {
      place_name: 'Ippudo',
      address: '789 Sukhumvit Soi 19, Bangkok',
      reasoning: 'Consistent quality and a lively atmosphere for a date night.',
      source: 'discovered',
      photos: { square: undefined },
    },
  ],
  reasoning_steps: [
    { step: 'intent_parsing', summary: 'Parsed: cuisine=ramen, occasion=date night, area=Sukhumvit' },
    { step: 'retrieval', summary: 'Found 3 saved ramen places near Sukhumvit' },
    { step: 'discovery', summary: 'Searching 38 restaurants within 1.2 km' },
    { step: 'validation', summary: '24 places open now' },
    { step: 'ranking', summary: 'Ranked 8 candidates by taste fit, distance, and occasion' },
    { step: 'completion', summary: 'Found your match' },
  ],
  context_chips: ['ramen', 'date night', 'Sukhumvit'],
};

const chatClientFixtures: ChatClient = {
  async chat({ message }) {
    await new Promise((r) => setTimeout(r, 800));
    const intent = classifyIntent(message);

    if (intent === 'recall') {
      return { type: 'recall', message: '', data: { results: [], total: 0 } };
    }
    if (intent === 'save') {
      return {
        type: 'extract-place',
        message: 'Place saved.',
        data: { status: 'resolved', place_name: 'Example Place', requires_confirmation: false },
      };
    }
    if (intent === 'assistant') {
      return { type: 'assistant', message: 'I can help you find a great spot!', data: null };
    }
    // Default: consult
    return { type: 'consult', message: '', data: CONSULT_FIXTURE };
  },
};

export function getChatClient(getToken: () => Promise<string>): ChatClient {
  if (process.env.NEXT_PUBLIC_CHAT_FIXTURES === 'true') {
    return chatClientFixtures;
  }
  return makeRealChatClient(getToken);
}
