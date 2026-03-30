import { Module } from '@nestjs/common';
import { AiServiceModule } from '../ai-service/ai-service.module';
import { RecallController } from './recall.controller';
import { RecallService } from './recall.service';

@Module({
  imports: [AiServiceModule],
  controllers: [RecallController],
  providers: [RecallService],
})
export class RecallModule {}
