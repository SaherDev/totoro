import { Module } from '@nestjs/common';
import { AiServiceModule } from '../ai-service/ai-service.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AiServiceModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
