import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser, UserContextResponse } from '@totoro/shared';
import {
  AI_SERVICE_CLIENT,
  IAiServiceClient,
} from '../ai-service/ai-service-client.interface';

@Injectable()
export class UserContextService {
  constructor(
    @Inject(AI_SERVICE_CLIENT) private readonly aiClient: IAiServiceClient
  ) {}

  async get(user: AuthUser): Promise<UserContextResponse> {
    const aiContext = await this.aiClient.getUserContext(user.id);
    return { ...aiContext, plan: user.plan ?? null };
  }
}
