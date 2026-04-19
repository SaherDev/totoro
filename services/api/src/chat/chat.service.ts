import { Injectable, Inject } from '@nestjs/common';
import { ChatResponseDto } from '@totoro/shared';
import {
  IAiServiceClient,
  AI_SERVICE_CLIENT,
} from '../ai-service/ai-service-client.interface';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { ChatRequestBodyDto } from './dto/chat-request.dto';

/**
 * Service for handling chat requests
 * Injects user_id from Clerk auth and forwards to the AI service
 *
 * ADR-036: Single forwarding call — no routing logic, no response transformation
 * ADR-032: Business logic lives here, not in the controller
 */
@Injectable()
export class ChatService {
  constructor(
    @Inject(AI_SERVICE_CLIENT) private readonly aiClient: IAiServiceClient,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async chat(userId: string, dto: ChatRequestBodyDto): Promise<ChatResponseDto> {
    this.rateLimitService.incrementTurns(userId);

    const response = await this.aiClient.chat({
      user_id: userId,
      message: dto.message,
      location: dto.location ?? null,
      signal_tier: dto.signal_tier ?? null,
    });

    if (response.session_started) {
      this.rateLimitService.onSessionStarted(userId);
    }
    this.rateLimitService.addToolCalls(userId, response.tool_calls_used ?? 0);

    return response;
  }
}
