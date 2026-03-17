import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to inject the current authenticated user's ID
 * Extracts req.user.id from the Clerk auth middleware
 *
 * Usage:
 * @Post()
 * async create(@CurrentUser() userId: string, @Body() dto: CreateDto) {
 *   // userId is the authenticated user's ID from Clerk
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  }
);
