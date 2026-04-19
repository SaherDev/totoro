'use client';

import { Capacitor } from '@capacitor/core';
import type { ChatResponseDto, SignalTier } from '@totoro/shared';
import { classifyIntent } from './classify-intent';
import { recallFixture } from '../flows/recall/recall.fixtures';
import { saveFixture } from '../flows/save/save.fixtures';
import { assistantFixture } from '../flows/assistant/assistant.fixtures';
import { consultFixture } from '../flows/consult/consult.fixtures';
import { FetchClient } from '../api/transports/fetch.transport';

export interface ChatClientOptions {
  message: string;
  signal?: AbortSignal;
  signalTier?: SignalTier | null;
}

export interface ChatClient {
  chat(opts: ChatClientOptions): Promise<ChatResponseDto>;
}

export interface RateLimitInfo {
  limit: 'turns_per_session' | 'sessions_per_day' | 'tool_calls_per_day';
  limit_value: number;
}

function categorizeError(err: unknown): 'offline' | 'timeout' | 'server' | 'rate_limit' | 'generic' {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (err instanceof Error && err.name === 'AbortError') return 'timeout';
  return 'generic';
}

function makeRealChatClient(getToken: () => Promise<string>): ChatClient {
  // Single FetchClient instance — the HttpClient layer is the only place
  // that attaches `location` to outbound bodies (read from locationStore).
  // Call sites pass the message; the transport handles auth, headers,
  // location, and base URL.
  // In the Capacitor iOS shell, prepend the absolute Railway base URL so
  // API calls bypass the Vercel rewrite; in the browser, use a relative
  // path and let Vercel's rewrite proxy to Railway server-to-server.
  const apiBase = Capacitor.isNativePlatform()
    ? (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/v1\/?$/, '')
    : '';
  const http = new FetchClient(apiBase, getToken);

  return {
    async chat({ message, signal, signalTier }) {
      try {
        return await http.post<ChatResponseDto>(
          '/api/v1/chat',
          { message, ...(signalTier != null ? { signal_tier: signalTier } : {}) },
          signal,
        );
      } catch (err) {
        const category = categorizeError(err);
        if (err instanceof Error && 'status' in err) {
          const status = (err as Error & { status: number }).status;
          const body = (err as Error & { body?: Record<string, unknown> }).body;
          if (status === 429 && body?.error === 'rate_limit_exceeded') {
            throw Object.assign(new Error('rate_limit_exceeded'), {
              category: 'rate_limit' as const,
              rateLimitInfo: { limit: body.limit, limit_value: body.limit_value } as RateLimitInfo,
            });
          }
          throw Object.assign(new Error(`HTTP ${status}`), {
            category: status >= 500 ? 'server' : 'generic',
          });
        }
        throw Object.assign(new Error(String(err)), { category });
      }
    },
  };
}

// Per-intent fixture dispatcher with configurable delays
const chatClientFixtures: ChatClient = {
  async chat(opts) {
    const intent = classifyIntent(opts.message);

    // Per-intent fixture dispatch and delays
    let res: ChatResponseDto;
    let delay: number;

    switch (intent) {
      case 'recall': {
        res = await recallFixture(opts);
        delay = 400;
        break;
      }
      case 'save': {
        res = await saveFixture(opts);
        delay = 800;
        break;
      }
      case 'assistant': {
        res = await assistantFixture(opts);
        delay = 300;
        break;
      }
      case 'consult':
      default: {
        res = await consultFixture(opts);
        delay = 2500;
        break;
      }
    }

    // Apply per-intent delay (minus any time already spent in fixture resolution)
    await new Promise((r) => setTimeout(r, delay));

    return res;
  },
};

export function getChatClient(getToken: () => Promise<string>): ChatClient {
  if (process.env.NEXT_PUBLIC_CHAT_FIXTURES === 'true') {
    return chatClientFixtures;
  }
  return makeRealChatClient(getToken);
}
