export class RecallPlaceDto {
  place_id!: string;
  place_name!: string;
  address!: string;
  cuisine?: string;
  price_range?: string;
  source_url?: string;
  match_reason!: string;
}
