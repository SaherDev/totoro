import type { UserContextResponse } from '@totoro/shared';
import { IAiServiceClient } from '../ai-service/ai-service-client.interface';
import { UserContextService } from './user-context.service';

describe('UserContextService', () => {
  let service: UserContextService;
  let aiClient: jest.Mocked<IAiServiceClient>;

  beforeEach(() => {
    aiClient = {
      chat: jest.fn(),
      postSignal: jest.fn(),
      getUserContext: jest.fn(),
    };
    service = new UserContextService(aiClient);
  });

  it('forwards the Clerk user id and returns the AI response unchanged', async () => {
    const body: UserContextResponse = {
      saved_places_count: 4,
      chips: [
        {
          label: 'Japanese',
          source_field: 'subcategory',
          source_value: 'japanese',
          signal_count: 2,
        },
      ],
    };
    aiClient.getUserContext.mockResolvedValueOnce(body);

    const result = await service.get('user_clerk_123');

    expect(aiClient.getUserContext).toHaveBeenCalledWith('user_clerk_123');
    expect(result).toEqual(body);
  });

  it('passes through a cold-start response', async () => {
    const body: UserContextResponse = { saved_places_count: 0, chips: [] };
    aiClient.getUserContext.mockResolvedValueOnce(body);

    const result = await service.get('user_new');

    expect(result).toEqual(body);
  });
});
