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
}

/**
 * Injection token for IAiServiceClient
 * Used with @Inject(AI_SERVICE_CLIENT) in NestJS services
 */
export const AI_SERVICE_CLIENT = Symbol('IAiServiceClient');
