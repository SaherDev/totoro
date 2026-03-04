/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { API_GLOBAL_PREFIX } from '@totoro/shared';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  const port = process.env.PORT;
  if (!port) {
    throw new Error('PORT environment variable is not set. Run: source scripts/env-setup.sh');
  }
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${API_GLOBAL_PREFIX}`);
}

bootstrap();
