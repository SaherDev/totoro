/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';

async function bootstrap() {
  // Create app with rawBody enabled for webhook signature verification
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('app.api_prefix');
  const port = process.env.PORT || configService.get<number>('app.port');
  const corsOrigins = configService.get<string[]>('app.cors_origins', []);

  if (!port) {
    throw new Error('PORT not configured. Check config/.local.yaml');
  }

  app.enableCors({ origin: corsOrigins, credentials: true });
  app.setGlobalPrefix(apiPrefix);
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
