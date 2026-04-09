import { IsString, IsNotEmpty, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class ChatRequestBodyDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
