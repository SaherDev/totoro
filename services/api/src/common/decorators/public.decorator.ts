import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'isPublic';

/**
 * @Public() decorator marks a route as public, bypassing Clerk JWT verification.
 * Use on health checks, status endpoints, or other routes that don't require auth.
 * The ClerkMiddleware checks for this metadata and skips verification if present.
 *
 * @example
 * @Post('/health')
 * @Public()
 * health() {
 *   return { status: 'ok' };
 * }
 */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
