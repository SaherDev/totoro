export type PlaceSource = 'saved' | 'discovered';

/**
 * User's geographic coordinates (latitude, longitude)
 */
export interface LocationCoordinates {
  lat: number;
  lng: number;
}

/**
 * A place recommendation result
 */
export interface PlaceResult {
  place_name: string;
  address: string;
  reasoning: string;
  source: PlaceSource;
}

/**
 * A single step in the AI agent's reasoning process
 */
export interface ReasoningStep {
  step: string;
  summary: string;
}

/**
 * Frontend request to consult endpoint
 * Can request streaming (SSE) or synchronous JSON response
 */
export interface ConsultRequest {
  query: string;
  location?: LocationCoordinates;
  stream?: boolean;
}

/**
 * Synchronous response from consult endpoint
 * Contains one primary recommendation and up to two alternatives
 */
export interface ConsultResponse {
  primary: PlaceResult;
  alternatives: PlaceResult[];
  reasoning_steps: ReasoningStep[];
}

/**
 * SSE event: a single reasoning step during streaming
 * Type discriminator: 'step'
 */
export interface SseStepEvent {
  type: 'step';
  step: string;
  summary: string;
}

/**
 * SSE event: the final consult result
 * Type discriminator: 'result'
 */
export interface SseResultEvent {
  type: 'result';
  primary: PlaceResult;
  alternatives: PlaceResult[];
  reasoning_steps: ReasoningStep[];
}

/**
 * Discriminated union of all SSE event types
 * Frontend can switch on the 'type' field to handle each event
 */
export type SseEvent = SseStepEvent | SseResultEvent;

/**
 * Chat request DTO for unified AI gateway
 * Handles extract-place, consult, recall, and general queries
 */
export interface ChatRequestDto {
  user_id: string;
  message: string;
  location?: { lat: number; lng: number };
}

/**
 * Chat response DTO for unified AI gateway
 * Type discriminates between different response kinds
 */
export interface ChatResponseDto {
  type: 'extract-place' | 'consult' | 'recall' | 'assistant' | 'clarification' | 'error';
  message: string;
  data: Record<string, unknown> | null;
}
