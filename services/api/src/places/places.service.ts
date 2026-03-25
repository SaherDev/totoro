import { Injectable, Inject } from '@nestjs/common';
import {
  IAiServiceClient,
  AI_SERVICE_CLIENT,
  AiExtractPlaceResponse,
} from '../ai-service/ai-service-client.interface';
import { ExtractPlaceRequestDto } from './dto/extract-place-request.dto';

@Injectable()
export class PlacesService {
  constructor(
    @Inject(AI_SERVICE_CLIENT) private readonly aiClient: IAiServiceClient
  ) {}

  async extractPlace(
    userId: string,
    dto: ExtractPlaceRequestDto
  ): Promise<AiExtractPlaceResponse> {
    return this.aiClient.extractPlace({
      user_id: userId,
      raw_input: dto.raw_input,
    });
  }
}
