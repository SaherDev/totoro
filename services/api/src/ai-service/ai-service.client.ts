import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'node:stream';
import {
  IAiServiceClient,
  AiConsultPayload,
  AiConsultResponse,
  AiExtractPlacePayload,
  AiExtractPlaceResponse,
  AiRecallPayload,
  AiRecallResponse,
} from './ai-service-client.interface';

/**
 * HTTP client for communicating with the AI service (totoro-ai)
 *
 * Implementation details:
 * - Uses NestJS HttpService (Axios-backed) for all HTTP requests
 * - Injects ConfigService for base URL and HttpService for transport
 * - Implements three methods: consult(), consultStream(), and extractPlace()
 * - Sets appropriate timeouts: 20s for consult/consultStream, 10s for extractPlace
 * - Lets AxiosError propagate raw; AllExceptionsFilter handles translation
 *
 * ADR-016: Migrated to HttpModule/Axios per architecture decision
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
    this.baseUrl = configService.get<string>('ai_service.base_url');
    if (!this.baseUrl) {
      throw new Error('ai_service.base_url is not configured');
    }

    this.logger.debug(`Initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Make a synchronous consult request to the AI service
   * Returns the full response as a JSON object
   * Per ADR-016 and Constitution VI, uses 20s timeout
   * Lets AxiosError propagate raw to callers
   */
  async consult(payload: AiConsultPayload): Promise<AiConsultResponse> {
    const response = await firstValueFrom(
      this.httpService.post<AiConsultResponse>(
        `${this.baseUrl}/v1/consult`,
        payload,
        { timeout: 20000 }
      )
    );
    return response.data;
  }

  /**
   * Make a streaming consult request to the AI service
   * Returns a Readable stream of Server-Sent Events
   * Per ADR-016 and Constitution VI, uses 20s timeout
   * Axios with responseType: 'stream' returns a Node.js Readable stream
   * Lets AxiosError propagate raw to callers
   */
  async consultStream(payload: AiConsultPayload): Promise<Readable> {
    const response = await firstValueFrom(
      this.httpService.post<Readable>(
        `${this.baseUrl}/v1/consult`,
        payload,
        { timeout: 20000, responseType: 'stream' }
      )
    );
    return response.data;
  }

  /**
   * Extract and validate a place from raw user input
   * Forwards the input to the AI service for parsing and validation
   * Per api-contract.md FR-003, uses 10s timeout
   * Lets AxiosError propagate raw to callers
   */
  async extractPlace(
    payload: AiExtractPlacePayload
  ): Promise<AiExtractPlaceResponse> {
    const response = await firstValueFrom(
      this.httpService.post<AiExtractPlaceResponse>(
        `${this.baseUrl}/v1/extract-place`,
        payload,
        { timeout: 10000 }
      )
    );
    return response.data;
  }

  /**
   * Search for saved places matching a memory fragment
   * Per Constitution §VI, uses 20s timeout
   * Lets AxiosError propagate raw to callers
   */
  async recall(payload: AiRecallPayload): Promise<AiRecallResponse> {
    const response = await firstValueFrom(
      this.httpService.post<AiRecallResponse>(
        `${this.baseUrl}/v1/recall`,
        payload,
        { timeout: 20000 }
      )
    );
    return response.data;
  }
}
