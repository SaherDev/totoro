import { Controller, Post, Body } from '@nestjs/common';
import { PlacesService } from './places.service';
import { ExtractPlaceRequestDto } from './dto/extract-place-request.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresAi } from '../common/decorators/requires-ai.decorator';

/**
 * Controller for the places endpoints
 * Pure facade pattern (ADR-032) — makes exactly one service call
 *
 * Endpoints:
 * - POST /api/v1/places/extract
 *   - Body: { raw_input }
 *   - Response: Place extraction result with metadata and confidence
 *
 * Auth:
 * - Requires valid Clerk token (via middleware)
 * - Requires AI to be enabled (via @RequiresAi() guard)
 */
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  /**
   * Extract and validate a place from raw user input
   *
   * @param userId - Injected from Clerk auth token via @CurrentUser()
   * @param dto - Validated request body with raw_input
   * @returns Place extraction result with metadata and confidence
   */
  @Post('extract')
  @RequiresAi()
  async extractPlace(
    @CurrentUser() userId: string,
    @Body() dto: ExtractPlaceRequestDto
  ) {
    return this.placesService.extractPlace(userId, dto);
  }
}
