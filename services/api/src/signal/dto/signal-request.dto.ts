import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import type { SignalType } from '@totoro/shared';

const ALLOWED_SIGNAL_TYPES: SignalType[] = [
  'recommendation_accepted',
  'recommendation_rejected',
  'chip_confirm',
];

export class SignalRequestDto {
  @IsIn(ALLOWED_SIGNAL_TYPES)
  signal_type!: SignalType;

  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.signal_type !== 'chip_confirm')
  recommendation_id?: string;

  @IsString()
  @IsNotEmpty()
  @ValidateIf(o => o.signal_type !== 'chip_confirm')
  place_id?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
