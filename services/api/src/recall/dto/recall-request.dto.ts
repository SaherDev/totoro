import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RecallRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query: string;
}
