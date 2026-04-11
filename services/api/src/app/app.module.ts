import {
  Module,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import * as yaml from 'yaml';
import * as fs from 'fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClerkMiddleware } from '../common/middleware/clerk.middleware';
import { ClerkWebhookController } from '../webhooks/clerk.webhook';
import { AiEnabledGuard } from '../common/guards/ai-enabled.guard';
import { UserEntity } from '../database/entities/user.entity';
import { UserSettingsEntity } from '../database/entities/user-settings.entity';
import { DatabaseModule } from '../database/database.module';
import { ChatModule } from '../chat/chat.module';

function loadAppYaml(): Record<string, unknown> {
  const yamlPath = path.join(process.cwd(), 'services/api/config/app.yaml');
  try {
    return yaml.parse(fs.readFileSync(yamlPath, 'utf-8')) ?? {};
  } catch {
    return {};
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Secrets: loaded from .env.local for local dev; Railway injects them as env vars in production
      envFilePath: path.join(process.cwd(), 'services/api/.env.local'),
      // Non-secrets: loaded from committed app.yaml
      load: [loadAppYaml],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [UserEntity, UserSettingsEntity],
        synchronize: config.get<string>('app.environment') !== 'production',
      }),
    }),
    DatabaseModule,
    ChatModule,
  ],
  controllers: [AppController, ClerkWebhookController],
  providers: [AppService, AiEnabledGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClerkMiddleware).forRoutes('*');
  }
}
