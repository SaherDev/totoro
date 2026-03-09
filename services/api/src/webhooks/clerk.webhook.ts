import {
  Controller,
  Post,
  RawBodyRequest,
  Req,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { Request } from 'express';
import { Webhook } from 'svix';
import { Public } from '../common/decorators/public.decorator';

/**
 * Clerk webhook event structure (simplified for typing).
 * The actual event includes more fields per Clerk's webhook schema.
 */
interface ClerkWebhookEvent {
  type: string;
  data?: Record<string, unknown>;
}

/**
 * ClerkWebhookController handles incoming Clerk webhook events.
 * The @Public() decorator allows this endpoint to receive unsigned requests.
 * Webhook signature verification is performed using svix's Webhook.verify() method.
 *
 * Currently handles user.created event to initialize new users with ai_enabled=true.
 * TODO: Implement Clerk Backend API call to set publicMetadata.ai_enabled (ADR-022).
 */
@Controller('webhooks')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(private configService: ConfigService) {}

  @Post('clerk')
  @Public()
  async handleClerkWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean }> {
    const webhookSecret = this.configService.get<string>('auth.clerk.webhook_secret');

    if (!webhookSecret) {
      this.logger.error(
        'CLERK_WEBHOOK_SECRET not configured. Webhook verification cannot proceed.',
      );
      throw new BadRequestException(
        'Webhook secret not configured. Check services/api/config/.local.yaml → auth.clerk.webhook_secret.',
      );
    }

    try {
      // Extract raw body for signature verification
      // svix.Webhook.verify() requires the original request body (not parsed JSON)
      const rawBody = req.rawBody
        ? req.rawBody
        : JSON.stringify(req.body);

      // Verify webhook signature using svix
      const wh = new Webhook(webhookSecret);
      const payload = wh.verify(
        rawBody,
        req.headers as Record<string, string>,
      );

      // Type the payload as a Clerk webhook event
      const clerkEvent = payload as ClerkWebhookEvent;

      // Handle user.created event
      if (clerkEvent.type === 'user.created') {
        const userId = clerkEvent.data.id as string;
        this.logger.log(`New user created: ${userId}`);

        const secretKey = this.configService.get<string>('auth.clerk.secret_key');
        const clerk = createClerkClient({ secretKey });
        await clerk.users.updateUser(userId, {
          publicMetadata: { ai_enabled: true },
        });
        this.logger.log(`Set ai_enabled=true for user ${userId}`);
      }

      // For any other event type, log and return success
      if (clerkEvent.type !== 'user.created') {
        this.logger.debug(
          `Received Clerk webhook event (type: ${clerkEvent.type}). No action needed.`,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Return 400 Bad Request for verification failures
      throw new BadRequestException('Webhook verification failed');
    }
  }
}
