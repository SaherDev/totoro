import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ExtractPlaceRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10240)
  raw_input: string;
}
