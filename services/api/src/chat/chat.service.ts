import { Injectable, Inject, Logger } from '@nestjs/common';
import { Response } from 'express';
import {
  IAiServiceClient,
  AI_SERVICE_CLIENT,
} from '../ai-service/ai-service-client.interface';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { ChatRequestBodyDto } from './dto/chat-request.dto';

/**
 * Service for handling chat requests
 * Pipes the raw SSE stream from the AI service straight through to the client.
 *
 * ADR-036: No routing logic, no response transformation.
 * ADR-032: Business logic lives here, not in the controller.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(AI_SERVICE_CLIENT) private readonly aiClient: IAiServiceClient,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async pipeStream(
    userId: string,
    dto: ChatRequestBodyDto,
    res: Response,
  ): Promise<void> {
    this.rateLimitService.incrementTurns(userId);

    const stream = await this.aiClient.chatStream({
      user_id: userId,
      message: dto.message,
      location: dto.location ?? null,
      signal_tier: dto.signal_tier ?? null,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.on('close', () => stream.destroy());
    stream.on('error', (err) => {
      this.logger.error('AI service stream error', err);
      if (!res.headersSent) {
        res.status(503).end();
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  }
}
