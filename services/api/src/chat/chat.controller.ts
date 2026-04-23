import { Controller, Post, Body, Res, Req, UseGuards } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { Response } from 'express';
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
 * - Requires AI enabled (via @RequiresAi() guard per ADR-022)
 * - Pipes raw SSE stream from the AI service to the client; NestJS is transparent
 */
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @RequiresAi()
  @UseGuards(RateLimitGuard)
  async chat(
    @CurrentUser() userId: string,
    @Body() dto: ChatRequestBodyDto,
    @Req() req: IncomingMessage,
    @Res() res: Response,
  ): Promise<void> {
    await this.chatService.pipeStream(userId, dto, req, res);
  }
}
