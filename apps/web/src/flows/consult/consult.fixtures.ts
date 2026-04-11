import type { ChatRequestDto, ChatResponseDto } from '@totoro/shared';

export async function consultFixture(_req: ChatRequestDto): Promise<ChatResponseDto> {
  await new Promise((r) => setTimeout(r, 800));
  return {
    type: 'consult',
    message: '',
    data: {
      primary: {
        place_name: 'Fuji Ramen',
        address: '123 Sukhumvit Soi 33, Bangkok',
        reasoning: 'Your top-rated ramen spot. 10 minutes from you and perfect for a quiet dinner.',
        source: 'saved',
        photos: { hero: undefined, square: undefined },
      },
      alternatives: [
        {
          place_name: 'Bankara Ramen',
          address: '456 Sukhumvit Soi 39, Bangkok',
          reasoning: 'Rich tonkotsu broth — matches your preference for bold flavours.',
          source: 'discovered',
          photos: { square: undefined },
        },
        {
          place_name: 'Ippudo',
          address: '789 Sukhumvit Soi 19, Bangkok',
          reasoning: 'Consistent quality and a lively atmosphere for a date night.',
          source: 'discovered',
          photos: { square: undefined },
        },
      ],
      reasoning_steps: [
        { step: 'intent_parsing', summary: 'Parsed: cuisine=ramen, occasion=date night, area=Sukhumvit' },
        { step: 'retrieval',      summary: 'Found 3 saved ramen places near Sukhumvit' },
        { step: 'discovery',      summary: 'Searching 38 restaurants within 1.2 km' },
        { step: 'validation',     summary: '24 places open now' },
        { step: 'ranking',        summary: 'Ranked 8 candidates by taste fit, distance, and occasion' },
        { step: 'completion',     summary: 'Found your match' },
      ],
      context_chips: ['ramen', 'date night', 'Sukhumvit'],
    },
  };
}
