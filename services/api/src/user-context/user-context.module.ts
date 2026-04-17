import { Module } from '@nestjs/common';
import { AiServiceModule } from '../ai-service/ai-service.module';
import { UserContextController } from './user-context.controller';
import { UserContextService } from './user-context.service';

@Module({
  imports: [AiServiceModule],
  controllers: [UserContextController],
  providers: [UserContextService],
})
export class UserContextModule {}
