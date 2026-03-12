import { UseGuards, applyDecorators } from '@nestjs/common';
import { AiEnabledGuard } from '../guards/ai-enabled.guard';

/**
 * @RequiresAi() decorator applies the AiEnabledGuard to endpoints that require AI access.
 * Shorthand for @UseGuards(AiEnabledGuard).
 *
 * Validates:
 * 1. Global AI kill switch is off
 * 2. User has AI enabled in their account
 *
 * @example
 * @Post('/consult')
 * @RequiresAi()
 * async consult(@Body() query: QueryDto) {
 *   return this.recommendationService.consult(query);
 * }
 */
export const RequiresAi = () => applyDecorators(UseGuards(AiEnabledGuard));
