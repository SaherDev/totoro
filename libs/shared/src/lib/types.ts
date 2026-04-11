/**
 * Chat request DTO for unified AI gateway
 * Handles extract-place, consult, recall, and general queries
 */
export interface ChatRequestDto {
  user_id: string;
  message: string;
  location?: { lat: number; lng: number };
}

export type ChatResponseType =
  | 'consult'
  | 'recall'
  | 'extract-place'
  | 'assistant'
  | 'clarification'
  | 'error';

export type ClientIntent = 'consult' | 'recall' | 'save' | 'assistant';

export interface ReasoningStep {
  step: string;
  summary: string;
}

export interface ConsultPlace {
  place_name: string;
  address: string;
  reasoning: string;
  source: 'saved' | 'discovered';
  photos?: { hero?: string; square?: string };
}

export interface ConsultResponseData {
  primary: ConsultPlace;
  alternatives: ConsultPlace[];
  reasoning_steps: ReasoningStep[];
  context_chips?: string[];
}

export interface RecallItem {
  place_id: string;
  place_name: string;
  address: string;
  cuisine: string | null;
  price_range: string | null;
  source_url: string | null;
  saved_at: string;
  match_reason: string;
}

export interface RecallResponseData {
  results: RecallItem[];
  total: number;
}

export interface SavedPlaceStub {
  place_id: string;
  place_name: string;
  address: string;
  saved_at: string;
}

/**
 * Chat response DTO for unified AI gateway
 * Type discriminates between different response kinds
 */
export interface ChatResponseDto {
  type: ChatResponseType;
  message: string;
  data: ConsultResponseData | RecallResponseData | Record<string, unknown> | null;
}
