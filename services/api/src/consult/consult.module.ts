import { Module } from '@nestjs/common';
import { AiServiceModule } from '../ai-service/ai-service.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { ConsultController } from './consult.controller';
import { ConsultService } from './consult.service';

/**
 * Module for the consult endpoint
 * Provides recommendations based on user intent and location
 *
 * Supports two modes:
 * - Synchronous: POST /api/v1/consult (default) → JSON response
 * - Streaming: POST /api/v1/consult?stream=true → SSE stream
 *
 * Dependencies:
 * - AiServiceModule: Provides IAiServiceClient for forwarding to FastAPI
 * - RecommendationsModule: Provides RecommendationsRepository for persisting results
 */
@Module({
  imports: [AiServiceModule, RecommendationsModule],
  controllers: [ConsultController],
  providers: [ConsultService],
  exports: [ConsultService],
})
export class ConsultModule {}
