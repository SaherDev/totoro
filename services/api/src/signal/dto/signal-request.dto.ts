import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { SignalType } from '@totoro/shared';

const ALLOWED_SIGNAL_TYPES: SignalType[] = [
  'recommendation_accepted',
  'recommendation_rejected',
];

export class SignalRequestDto {
  @IsIn(ALLOWED_SIGNAL_TYPES)
  signal_type!: SignalType;

  @IsString()
  @IsNotEmpty()
  recommendation_id!: string;

  @IsString()
  @IsNotEmpty()
  place_id!: string;
}
