import { Module } from '@nestjs/common';
import { AiServiceModule } from '../ai-service/ai-service.module';
import { SignalController } from './signal.controller';
import { SignalService } from './signal.service';

@Module({
  imports: [AiServiceModule],
  controllers: [SignalController],
  providers: [SignalService],
})
export class SignalModule {}
