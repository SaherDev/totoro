import { Module } from '@nestjs/common';
import { AiServiceModule } from '../ai-service/ai-service.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [AiServiceModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
