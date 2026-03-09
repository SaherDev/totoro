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

const configPath = path.join(process.cwd(), 'services/api/config/.local.yaml');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => {
          const fileContent = fs.readFileSync(configPath, 'utf-8');
          return yaml.parse(fileContent);
        },
      ],
    }),
  ],
  controllers: [AppController, ClerkWebhookController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClerkMiddleware).forRoutes('*');
  }
}
