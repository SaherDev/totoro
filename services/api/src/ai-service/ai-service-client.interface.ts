import { Readable } from 'stream';
import {
  ConsultRequest,
  ConsultResponse,
  LocationCoordinates,
} from '@totoro/shared';

/**
 * Payload sent from NestJS to the AI service for consult requests
 * Extends the frontend request with user_id (injected from Clerk auth)
 */
export interface AiConsultPayload extends ConsultRequest {
  user_id: string;
}

/**
 * A place recommendation from the AI service
 * Mirrors PlaceResult from @totoro/shared
 */
export interface AiPlaceResult {
  place_name: string;
  address: string;
  reasoning: string;
  source: 'saved' | 'discovered';
}

/**
 * A single reasoning step from the AI service
 * Mirrors ReasoningStep from @totoro/shared
 */
export interface AiReasoningStep {
  step: string;
  summary: string;
}

/**
 * Response from the AI service's consult endpoint (non-streaming mode)
 * Mirrors ConsultResponse from @totoro/shared
 */
export interface AiConsultResponse {
  primary: AiPlaceResult;
  alternatives: AiPlaceResult[];
  reasoning_steps: AiReasoningStep[];
}

/**
 * Payload sent from NestJS to the AI service for place extraction requests
 * Matches api-contract.md exactly per FR-005
 */
export interface AiExtractPlacePayload {
  user_id: string;
  raw_input: string;
}

/**
 * Extracted place metadata from the AI service
 * Matches api-contract.md exactly per FR-006
 */
export interface AiExtractedPlace {
  place_name: string | null;
  address: string | null;
  cuisine: string | null;
  price_range: string | null;
}

/**
 * Response from the AI service's extract-place endpoint
 * Matches api-contract.md exactly per FR-006
 */
export interface AiExtractPlaceResponse {
  place_id: string | null;
  place: AiExtractedPlace;
  confidence: number;
  status: 'resolved' | 'unresolved';
  requires_confirmation: boolean;
  source_url: string | null;
}

/**
 * Interface for the AI service client
 * Abstracts HTTP communication with the AI service behind a clean contract
 * Implementation uses Node's built-in http/https module
 *
 * ADR-016: This is the reference implementation of the AiServiceClient pattern
 * ADR-033: Interface-first design — inject via IAiServiceClient, not concrete class
 */
export interface IAiServiceClient {
  /**
   * Make a synchronous consult request to the AI service
   * Returns the full response as a JSON object
   * Used when client does not request streaming
   */
  consult(payload: AiConsultPayload): Promise<AiConsultResponse>;

  /**
   * Make a streaming consult request to the AI service
   * Returns a Readable stream of Server-Sent Events
   * Used when client requests stream: true
   */
  consultStream(payload: AiConsultPayload): Promise<Readable>;

  /**
   * Extract and validate a place from raw user input
   * Forwards the input to the AI service for parsing and validation
   * Returns a confirmation with place metadata or an unresolved marker
   * Per api-contract.md, uses 10-second timeout
   */
  extractPlace(payload: AiExtractPlacePayload): Promise<AiExtractPlaceResponse>;
}

/**
 * Injection token for IAiServiceClient
 * Used with @Inject(AI_SERVICE_CLIENT) in NestJS services
 */
export const AI_SERVICE_CLIENT = Symbol('IAiServiceClient');
