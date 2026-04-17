import {
  ChatRequestDto,
  ChatResponseDto,
  SignalRequestWithUser,
  SignalResponse,
  UserContextResponse,
} from '@totoro/shared';

/**
 * Interface for the AI service client
 * Abstracts HTTP communication with the AI service behind a clean contract
 *
 * ADR-036: Unified POST /v1/chat for all intent-bearing user input. Intent
 * classification is the AI service's responsibility, not NestJS's.
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

  /**
   * Forward a user feedback signal to the AI service.
   * The caller has already injected user_id from the Clerk token.
   * Lets AxiosError propagate raw; AllExceptionsFilter handles 404 → 404 pass-through.
   */
  postSignal(payload: SignalRequestWithUser): Promise<SignalResponse>;

  /**
   * Fetch the user's taste-context summary from the AI service.
   * userId is forwarded as the `?user_id=…` query parameter per the FastAPI contract.
   */
  getUserContext(userId: string): Promise<UserContextResponse>;
}

/**
 * Injection token for IAiServiceClient
 * Used with @Inject(AI_SERVICE_CLIENT) in NestJS services
 */
export const AI_SERVICE_CLIENT = Symbol('IAiServiceClient');
