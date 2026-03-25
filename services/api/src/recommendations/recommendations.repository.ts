import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecommendationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    query: string;
    data: object;
  }) {
    return this.prisma.recommendation.create({
      data: {
        userId: data.userId,
        query: data.query,
        data: data.data,
        shown: false,
        accepted: null,
        selectedPlaceId: null,
      },
    });
  }
}
