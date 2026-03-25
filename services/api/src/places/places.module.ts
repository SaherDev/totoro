import { Module } from '@nestjs/common';
import { AiServiceModule } from '../ai-service/ai-service.module';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';

/**
 * Module for the places domain
 * Provides the extract place endpoint via PlacesController
 * Delegates to AiServiceClient for AI operations
 *
 * ADR-014: One module per domain
 * ADR-032: Facade controller pattern
 * ADR-033: Interface-first DI via AiServiceModule
 */
@Module({
  imports: [AiServiceModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
