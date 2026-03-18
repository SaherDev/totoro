import {
  Module,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import * as yaml from 'yaml';
import * as fs from 'fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClerkMiddleware } from '../common/middleware/clerk.middleware';
import { ClerkWebhookController } from '../webhooks/clerk.webhook';
import { AiEnabledGuard } from '../common/guards/ai-enabled.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { RecallModule } from '../recall/recall.module';
import { ConsultModule } from '../consult/consult.module';

const configPath = path.join(process.cwd(), 'services/api/config/.local.yaml');

function loadConfig(): Record<string, unknown> {
  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    return yaml.parse(fileContent);
  } catch {
    // No YAML file — build config from environment variables (Railway / production)
    return {
      app: {
        environment: process.env.APP_ENVIRONMENT ?? 'production',
        port: parseInt(process.env.PORT ?? '3333', 10),
        api_prefix: 'api/v1',
        cors_origins: (process.env.APP_CORS_ORIGINS ?? '').split(',').filter(Boolean),
      },
      database: { url: process.env.DATABASE_URL },
      auth: {
        public_paths: ['/health', '/webhooks/clerk'],
        clerk: {
          secret_key: process.env.CLERK_SECRET_KEY,
          webhook_secret: process.env.CLERK_WEBHOOK_SECRET,
        },
        dev_bypass: { enabled: false },
      },
      cache: { redis: { url: process.env.REDIS_URL } },
      integrations: { slack: { webhook_url: process.env.SLACK_WEBHOOK_URL } },
      ai_service: { base_url: process.env.AI_SERVICE_BASE_URL },
      ai: {
        enabled_default: process.env.AI_ENABLED_DEFAULT !== 'false',
        global_kill_switch: process.env.AI_GLOBAL_KILL_SWITCH === 'true',
      },
      features: {
        enable_external_places: process.env.FEATURES_ENABLE_EXTERNAL_PLACES !== 'false',
        enable_slack_alerts: process.env.FEATURES_ENABLE_SLACK_ALERTS === 'true',
      },
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    PrismaModule,
    RecallModule,
    ConsultModule,
  ],
  controllers: [AppController, ClerkWebhookController],
  providers: [AppService, AiEnabledGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClerkMiddleware).forRoutes('*');
  }
}
