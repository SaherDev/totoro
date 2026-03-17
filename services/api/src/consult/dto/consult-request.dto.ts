import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsBoolean,
  ValidateNested,
  Type,
} from 'class-validator';
import { ConsultRequest } from '@totoro/shared';
import { LocationDto } from './location.dto';

/**
 * Request DTO for the POST /api/v1/consult endpoint
 * Implements ConsultRequest from @totoro/shared
 * Includes validation for all incoming data
 *
 * Supports two modes:
 * - stream: false/absent → synchronous JSON response
 * - stream: true → Server-Sent Events stream
 */
export class ConsultRequestDto implements ConsultRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  query: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
