import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChatResponseDto } from '@totoro/shared';
import { ChatService } from './chat.service';
import { ChatRequestBodyDto } from './dto/chat-request.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresAi } from '../common/decorators/requires-ai.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

/**
 * Controller for the unified chat endpoint
 * Pure facade pattern (ADR-032) — makes exactly one service call
 *
 * POST /api/v1/chat
 * - Requires valid Clerk token (via ClerkMiddleware)
 * - Requires AI enabled (via @RequiresAi() guard per ADR-022 and FR-014)
 * - Returns HTTP 200 always — frontend reads `type` field for intent result
 */
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @RequiresAi()
  @UseGuards(RateLimitGuard)
  async chat(
    @CurrentUser() userId: string,
    @Body() dto: ChatRequestBodyDto
  ): Promise<ChatResponseDto> {
    return this.chatService.chat(userId, dto);
  }
}
