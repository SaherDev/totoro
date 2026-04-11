import type { ComponentType } from 'react';
import type { ZodSchema } from 'zod';
import type {
  ChatRequestDto,
  ChatResponseDto,
  ChatResponseType,
  ClientIntent,
} from '@totoro/shared';

export type FlowId = 'consult' | 'recall' | 'save' | 'assistant' | 'clarification';

export type HomePhase =
  | 'hydrating'
  | 'cold-0'
  | 'cold-1-4'
  | 'taste-profile'
  | 'idle'
  | 'thinking'
  | 'result'
  | 'recall'
  | 'save-sheet'
  | 'save-snackbar'
  | 'save-duplicate'
  | 'assistant-reply'
  | 'starter-pack'
  | 'error';

// Forward declaration — HomeStoreApi is the full store type exported from home-store.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HomeStoreApi = any;

export interface FlowDefinition<TData = unknown> {
  id: FlowId;
  matches: {
    clientIntent?: ClientIntent;
    responseType: ChatResponseType;
  };
  phase: HomePhase;
  inputPlaceholderKey: string;
  schema: ZodSchema<TData>;
  fixture: (req: ChatRequestDto) => Promise<ChatResponseDto>;
  onResponse: (res: ChatResponseDto, store: HomeStoreApi) => void;
  Component: ComponentType<{ store: HomeStoreApi }>;
}
