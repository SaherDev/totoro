import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ClerkUser } from '../middleware/clerk.middleware';

/**
 * @RequireAi() guard validates that the user can access AI-powered endpoints.
 *
 * Checks:
 * 1. If ai.global_kill_switch is true → throw ServiceUnavailableException (503)
 * 2. If user.ai_enabled is false → throw ForbiddenException (403)
 * 3. Otherwise → allow access (return true)
 *
 * Use with @UseGuards(RequireAiGuard) on endpoints that call the AI service.
 *
 * @example
 * @Post('/consult')
 * @UseGuards(RequireAiGuard)
 * async consult(@Body() query: QueryDto) {
 *   return this.recommendationService.consult(query);
 * }
 */
@Injectable()
export class RequireAiGuard implements CanActivate {
  private readonly logger = new Logger('RequireAiGuard');

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ClerkUser | undefined;

    // Check global kill switch
    const globalKillSwitch = this.configService.get<boolean>('ai.global_kill_switch', false);
    if (globalKillSwitch) {
      this.logger.warn('AI service is unavailable due to global kill switch');
      throw new ServiceUnavailableException('AI service is temporarily unavailable');
    }

    // Check user AI access
    if (!user) {
      this.logger.error('RequireAiGuard called without authenticated user');
      throw new ForbiddenException('User context not found');
    }

    if (!user.ai_enabled) {
      this.logger.warn(`User ${user.id} attempted to access AI endpoint but AI is disabled for their account`);
      throw new ForbiddenException('AI features are not enabled for your account');
    }

    return true;
  }
}
