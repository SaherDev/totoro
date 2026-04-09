import { ChatRequestDto, ChatResponseDto } from '@totoro/shared';

/**
 * Interface for the AI service client
 * Abstracts HTTP communication with the AI service behind a clean contract
 *
 * ADR-036: Replaces the three-method contract (consult, extractPlace, recall) with
 * a single chat() method that forwards all user input to POST /v1/chat.
 * Intent classification is the AI service's responsibility, not NestJS's.
 *
 * ADR-033: Interface-first design — inject via IAiServiceClient, not the concrete class
 */
export interface IAiServiceClient {
  /**
   * Forward a user message to the AI service.
   * The AI service classifies intent and returns a typed ChatResponseDto.
   * NestJS returns HTTP 200 for all chat responses — the frontend reads
   * the `type` field to determine what happened.
   */
  chat(payload: ChatRequestDto): Promise<ChatResponseDto>;
}

/**
 * Injection token for IAiServiceClient
 * Used with @Inject(AI_SERVICE_CLIENT) in NestJS services
 */
export const AI_SERVICE_CLIENT = Symbol('IAiServiceClient');
