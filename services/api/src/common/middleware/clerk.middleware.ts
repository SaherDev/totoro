import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

/**
 * Clerk public metadata schema. Clerk returns this in JWT public_metadata field.
 * Users can have custom metadata like ai_enabled set via Clerk API or webhook.
 */
interface ClerkPublicMetadata {
  ai_enabled?: boolean;
}

/**
 * User context attached to Express Request by ClerkMiddleware.
 * This interface is merged with Express.Request.user for type safety.
 */
export interface ClerkUser {
  id: string;
  ai_enabled: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: ClerkUser;
    }
  }
}

@Injectable()
export class ClerkMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ClerkMiddleware');

  constructor(private configService: ConfigService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip auth for public routes (by path pattern)
    // Note: Middleware runs before routing, so we check paths instead of decorators
    const publicPaths = this.configService.get<string[]>('auth.public_paths', ['/health', '/webhooks/clerk']);
    // Use originalUrl which includes the full path with query string
    const requestUrl = (req.originalUrl || req.url || '').split('?')[0]; // Remove query string
    if (publicPaths.some(path => requestUrl === path || requestUrl.startsWith(path + '/'))) {
      return next();
    }

    // Extract Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`Unauthorized access attempt to ${req.method} ${req.path}`);
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Dev bypass: allow a static token for local testing (never enabled in production)
    const isProd = this.configService.get<string>('app.environment') === 'production';
    const bypassEnabled = this.configService.get<boolean>('auth.dev_bypass.enabled', false);
    const bypassToken = this.configService.get<string>('auth.dev_bypass.token');
    const bypassUserId = this.configService.get<string>('auth.dev_bypass.user_id');
    if (!isProd && bypassEnabled && bypassToken && token === bypassToken && bypassUserId) {
      const aiEnabledDefault = this.configService.get<boolean>('ai.enabled_default', true);
      req.user = { id: bypassUserId, ai_enabled: aiEnabledDefault };
      this.logger.warn(`Dev bypass auth used for user ${bypassUserId} — never enable in production`);
      return next();
    }

    try {
      // Verify token using Clerk backend SDK
      const clerkSecretKey = this.configService.get<string>('auth.clerk.secret_key');
      if (!clerkSecretKey) {
        throw new Error('CLERK_SECRET_KEY not configured');
      }

      const verifiedSession = await verifyToken(token, {
        secretKey: clerkSecretKey,
      });

      // Extract user info from verified token
      const userId = verifiedSession.sub;
      if (!userId) {
        throw new UnauthorizedException('Invalid token: missing user ID');
      }

      // Get ai_enabled from public_metadata, default to config value
      const aiEnabledDefault = this.configService.get<boolean>('ai.enabled_default', true);
      const publicMetadata = (verifiedSession.public_metadata ?? {}) as ClerkPublicMetadata;
      const ai_enabled = publicMetadata.ai_enabled ?? aiEnabledDefault;

      // Attach user to request
      req.user = {
        id: userId,
        ai_enabled,
      };

      next();
    } catch (error) {
      this.logger.error(`Token verification failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
