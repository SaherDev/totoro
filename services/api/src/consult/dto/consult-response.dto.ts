import { IsString, IsOptional, IsArray, ValidateNested, Type } from 'class-validator';
import { ConsultResponse, PlaceResult, ReasoningStep } from '@totoro/shared';

/**
 * DTO for place result in a consult response
 */
export class PlaceResultDto implements PlaceResult {
  @IsString()
  place_name: string;

  @IsString()
  address: string;

  @IsString()
  reasoning: string;

  @IsString()
  source: 'saved' | 'discovered';
}

/**
 * DTO for reasoning step in a consult response
 */
export class ReasoningStepDto implements ReasoningStep {
  @IsString()
  step: string;

  @IsString()
  summary: string;
}

/**
 * Response DTO for the POST /api/v1/consult endpoint
 * Implements ConsultResponse from @totoro/shared
 * All fields are optional per ADR-019 (forward-compatible with evolving AI response)
 *
 * Contains:
 * - primary: The top recommendation
 * - alternatives: Up to 2 alternative recommendations
 * - reasoning_steps: Array of steps the agent took during reasoning
 */
export class ConsultResponseDto implements ConsultResponse {
  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceResultDto)
  primary?: PlaceResultDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceResultDto)
  alternatives?: PlaceResultDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReasoningStepDto)
  reasoning_steps?: ReasoningStepDto[];
}
