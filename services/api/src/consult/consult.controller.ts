import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConsultService } from './consult.service';
import { ConsultRequestDto } from './dto/consult-request.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresAi } from '../common/decorators/requires-ai.decorator';

/**
 * Controller for the consult endpoint
 * Pure facade pattern (ADR-032) — makes exactly one service call
 *
 * Endpoints:
 * - POST /api/v1/consult
 *   - Body: { query, location?, stream? }
 *   - Responses: JSON (non-streaming) or SSE stream (streaming)
 *
 * Auth:
 * - Requires valid Clerk token (via middleware)
 * - Requires AI to be enabled (via @RequiresAi() guard)
 */
@Controller('consult')
export class ConsultController {
  constructor(private readonly consultService: ConsultService) {}

  /**
   * Handle a consult request
   *
   * @param userId - Injected from Clerk auth token via @CurrentUser()
   * @param dto - Validated request body
   * @param req - Express request (for disconnect detection in streaming mode)
   * @param res - Express response (service owns the response)
   *
   * Returns:
   * - Non-streaming: 200 OK with JSON body
   * - Streaming: 200 OK with text/event-stream body
   * - Errors: Appropriate HTTP status codes
   */
  @Post()
  @RequiresAi()
  async consult(
    @CurrentUser() userId: string,
    @Body() dto: ConsultRequestDto,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response
  ): Promise<void> {
    // Service owns the response — no return value
    await this.consultService.handle(userId, dto, req, res);
  }
}
