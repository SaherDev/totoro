import { Module } from '@nestjs/common';
import { AiServiceModule } from '../ai-service/ai-service.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AiServiceModule, RateLimitModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
