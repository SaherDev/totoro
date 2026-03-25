import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsRepository } from './recommendations.repository';

@Module({
  imports: [PrismaModule],
  providers: [RecommendationsRepository],
  exports: [RecommendationsRepository],
})
export class RecommendationsModule {}
