import { Inject, Injectable } from '@nestjs/common';
import {
  IAiServiceClient,
  AI_SERVICE_CLIENT,
  AiRecallPayload,
} from '../ai-service/ai-service-client.interface';
import { RecallRequestDto } from './dto/recall-request.dto';
import { RecallResponseDto } from './dto/recall-response.dto';

@Injectable()
export class RecallService {
  constructor(
    @Inject(AI_SERVICE_CLIENT) private aiClient: IAiServiceClient
  ) {}

  /**
   * Search saved places matching the user's memory fragment.
   * Forwards request to totoro-ai with no transformation.
   */
  async recall(userId: string, dto: RecallRequestDto): Promise<RecallResponseDto> {
    const payload: AiRecallPayload = {
      user_id: userId,
      query: dto.query,
    };
    return this.aiClient.recall(payload);
  }
}
