import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ChatRequestDto,
  ChatResponseDto,
  SignalRequestWithUser,
  SignalResponse,
  UserContextResponse,
} from '@totoro/shared';
import { IAiServiceClient } from './ai-service-client.interface';

const AI_SERVICE_TIMEOUT_MS = 30000;

/**
 * HTTP client for communicating with the AI service (totoro-ai)
 *
 * ADR-036: Single chat() method replacing the previous three-method contract.
 * Calls POST /v1/chat with a 30-second timeout.
 * Lets AxiosError propagate raw; AllExceptionsFilter handles translation to HTTP errors.
 *
 * ADR-033: Injected via IAiServiceClient interface, not this class directly
 */
@Injectable()
export class AiServiceClient implements IAiServiceClient {
  private readonly logger = new Logger(AiServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.baseUrl = configService.get<string>('AI_SERVICE_BASE_URL');
    if (!this.baseUrl) {
      throw new Error('AI_SERVICE_BASE_URL is not configured');
    }

    this.logger.debug(`Initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Forward a user message to the AI service.
   * Uses 30-second timeout per ADR-036 (unified timeout for all intent types).
   * Lets AxiosError propagate raw to callers.
   */
  async chat(payload: ChatRequestDto): Promise<ChatResponseDto> {
    const response = await firstValueFrom(
      this.httpService.post<ChatResponseDto>(
        `${this.baseUrl}/v1/chat`,
        payload,
        { timeout: AI_SERVICE_TIMEOUT_MS }
      )
    );
    return response.data;
  }

  async postSignal(payload: SignalRequestWithUser): Promise<SignalResponse> {
    const response = await firstValueFrom(
      this.httpService.post<SignalResponse>(
        `${this.baseUrl}/v1/signal`,
        payload,
        { timeout: AI_SERVICE_TIMEOUT_MS }
      )
    );
    return response.data;
  }

  async getUserContext(userId: string): Promise<UserContextResponse> {
    const response = await firstValueFrom(
      this.httpService.get<UserContextResponse>(
        `${this.baseUrl}/v1/user/context`,
        { params: { user_id: userId }, timeout: AI_SERVICE_TIMEOUT_MS }
      )
    );
    return response.data;
  }
}
