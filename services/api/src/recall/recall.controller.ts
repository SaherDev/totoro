import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RecallService } from './recall.service';
import { RecallRequestDto } from './dto/recall-request.dto';
import { RecallResponseDto } from './dto/recall-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresAi } from '../common/decorators/requires-ai.decorator';

/**
 * Controller for the recall endpoint
 * Pure facade pattern (ADR-032) — makes exactly one service call
 *
 * Endpoints:
 * - POST /api/v1/recall
 *   - Body: { query }
 *   - Response: List of saved places matching the memory fragment
 *
 * Auth:
 * - Requires valid Clerk token (via middleware)
 * - Requires AI to be enabled (via @RequiresAi() guard)
 */
@Controller('recall')
export class RecallController {
  constructor(private readonly recallService: RecallService) {}

  /**
   * Search saved places matching a memory fragment
   *
   * @param userId - Injected from Clerk auth token via @CurrentUser()
   * @param dto - Validated request body with query
   * @returns List of saved places with match reasons
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @RequiresAi()
  async recall(
    @CurrentUser() userId: string,
    @Body() dto: RecallRequestDto
  ): Promise<RecallResponseDto> {
    return this.recallService.recall(userId, dto);
  }
}
