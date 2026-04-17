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
 * @Post('/signal')
 * @RequiresAi()
 * async submit(@CurrentUser() userId: string, @Body() dto: SignalRequestDto) {
 *   return this.signalService.submit(userId, dto);
 * }
 */
export const RequiresAi = () => applyDecorators(UseGuards(AiEnabledGuard));
