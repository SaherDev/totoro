import { IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * Geographic coordinates for a location
 * Used in consult requests to provide user location context
 */
export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}
