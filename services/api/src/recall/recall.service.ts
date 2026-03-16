import { Injectable, NotImplementedException } from '@nestjs/common';
import { RecallRequestDto } from './dto/recall-request.dto';
import { RecallResponseDto } from './dto/recall-response.dto';

@Injectable()
export class RecallService {
  /**
   * Search saved places matching the user's memory fragment.
   * Phase 1: stub returns 501. Phase 3: forwards to totoro-ai.
   */
  async recall(userId: string, request: RecallRequestDto): Promise<RecallResponseDto> {
    throw new NotImplementedException('Recall feature is not yet implemented');
  }
}
