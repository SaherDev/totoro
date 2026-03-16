import { RecallPlaceDto } from './recall-place.dto';

export class RecallResponseDto {
  results: RecallPlaceDto[];
  total: number;
}
