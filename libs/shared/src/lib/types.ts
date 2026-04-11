/**
 * Chat request DTO for unified AI gateway
 * Handles extract-place, consult, recall, and general queries
 */
export interface ChatRequestDto {
  message: string;
  location?: { lat: number; lng: number } | null;
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
  photos?: { hero?: string | null; square?: string | null } | null;
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
  thumbnail_url?: string;
}

export interface RecallResponseData {
  results: RecallItem[];
  total: number;
  has_more: boolean;
}

export interface SavedPlaceStub {
  place_id: string;
  place_name: string;
  address: string;
  saved_at: string;
  source_url: string | null;
  thumbnail_url?: string;
}

export interface ExtractPlaceData {
  place_id: string | null;
  place: {
    place_name: string | null;
    address: string | null;
    cuisine: string | null;
    price_range: string | null;
    thumbnail_url?: string;
  };
  confidence: number;
  status: 'resolved' | 'unresolved' | 'duplicate';
  requires_confirmation: boolean;
  source_url: string | null;
  original_saved_at?: string;
}

export interface SaveSheetPlace {
  name: string;
  source: string;
  location: string;
  thumbnail_url?: string;
}

/**
 * Chat response DTO for unified AI gateway
 * Type discriminates between different response kinds
 */
export interface ChatResponseDto {
  type: ChatResponseType;
  message: string;
  data: ConsultResponseData | RecallResponseData | ExtractPlaceData | Record<string, unknown> | null;
}
