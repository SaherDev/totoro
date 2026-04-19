import {
  Controller,
  Post,
  RawBodyRequest,
  Req,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClerkClient } from "@clerk/backend";
import { Request } from "express";
import { Webhook } from "svix";
import { RateLimitService } from "../rate-limit/rate-limit.service";

interface ClerkWebhookEvent {
  type: string;
  data?: Record<string, unknown>;
}

@Controller("webhooks")
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private configService: ConfigService,
    private rateLimitService: RateLimitService,
  ) {}

  @Post("clerk")
  // Public route (see auth.public_paths in config)
  async handleClerkWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ success: boolean }> {
    const event = this.verifySignature(req);

    if (event.type === "user.created") {
      await this.onUserCreated(event.data.id as string);
    } else if (event.type === "session.created") {
      const userId = event.data?.user_id as string;
      if (userId) await this.backfillMissingMetadata(userId);
    } else if (event.type === "session.ended") {
      const userId = event.data?.user_id as string;
      if (userId) {
        this.rateLimitService.resetTurns(userId);
        this.logger.log(`Turns reset for user ${userId} on session.ended`);
      }
    } else {
      this.logger.debug(`Unhandled Clerk event: ${event.type}`);
    }

    return { success: true };
  }

  private verifySignature(req: RawBodyRequest<Request>): ClerkWebhookEvent {
    const webhookSecret = this.configService.get<string>(
      "CLERK_WEBHOOK_SECRET",
    );
    if (!webhookSecret) {
      this.logger.error("CLERK_WEBHOOK_SECRET not configured");
      throw new BadRequestException(
        "Webhook secret not configured. Set the CLERK_WEBHOOK_SECRET environment variable.",
      );
    }

    try {
      const rawBody = req.rawBody ?? JSON.stringify(req.body);
      const wh = new Webhook(webhookSecret);
      return wh.verify(
        rawBody,
        req.headers as Record<string, string>,
      ) as ClerkWebhookEvent;
    } catch (error) {
      this.logger.error(
        `Signature verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException("Webhook verification failed");
    }
  }

  private async backfillMissingMetadata(userId: string): Promise<void> {
    const secretKey = this.configService.get<string>("CLERK_SECRET_KEY");
    const clerk = createClerkClient({ secretKey });
    const user = await clerk.users.getUser(userId);
    const meta = user.publicMetadata as Record<string, unknown>;
    if (meta.plan !== undefined) return;
    const defaultPlan = this.configService.get<string>("rate_limits.default_plan", "homebody");
    const aiEnabled = this.configService.get<boolean>("ai.enabled_default", true);
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        ...meta,
        ai_enabled: meta.ai_enabled ?? aiEnabled,
        plan: defaultPlan,
      },
    });
    this.logger.log(`Backfilled plan=${defaultPlan} for existing user ${userId}`);
  }

  private async onUserCreated(userId: string): Promise<void> {
    this.logger.log(`New user created: ${userId}`);
    const secretKey = this.configService.get<string>("CLERK_SECRET_KEY");
    const aiEnabled = this.configService.get<boolean>("ai.enabled_default", true);
    const defaultPlan = this.configService.get<string>("rate_limits.default_plan", "homebody");
    const clerk = createClerkClient({ secretKey });
    const user = await clerk.users.getUser(userId);
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        ai_enabled: aiEnabled,
        plan: defaultPlan,
      },
    });
    this.logger.log(`Set ai_enabled=${aiEnabled} plan=${defaultPlan} for user ${userId}`);
  }
}
