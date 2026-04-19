import { Injectable, Inject } from '@nestjs/common';
import { ChatResponseDto } from '@totoro/shared';
import {
  IAiServiceClient,
  AI_SERVICE_CLIENT,
} from '../ai-service/ai-service-client.interface';
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
    @Inject(AI_SERVICE_CLIENT) private readonly aiClient: IAiServiceClient
  ) {}

  async chat(userId: string, dto: ChatRequestBodyDto): Promise<ChatResponseDto> {
    return this.aiClient.chat({
      user_id: userId,
      message: dto.message,
      location: dto.location ?? null,
      signal_tier: dto.signal_tier ?? null,
    });
  }
}
