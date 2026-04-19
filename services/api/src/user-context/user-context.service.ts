import { Inject, Injectable } from '@nestjs/common';
import type { UserContextResponse } from '@totoro/shared';
import {
  AI_SERVICE_CLIENT,
  IAiServiceClient,
} from '../ai-service/ai-service-client.interface';

@Injectable()
export class UserContextService {
  constructor(
    @Inject(AI_SERVICE_CLIENT) private readonly aiClient: IAiServiceClient
  ) {}

  async get(userId: string): Promise<UserContextResponse> {
    return this.aiClient.getUserContext(userId);
  }
}
