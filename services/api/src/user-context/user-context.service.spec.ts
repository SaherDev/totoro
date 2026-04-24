import type { AiUserContext, AuthUser } from '@totoro/shared';
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

  it('forwards the Clerk user id and merges plan into the AI response', async () => {
    const body: AiUserContext = {
      saved_places_count: 4,
      signal_tier: 'active',
      chips: [
        {
          label: 'Japanese',
          source_field: 'subcategory',
          source_value: 'japanese',
          signal_count: 2,
          status: 'confirmed',
          selection_round: null,
        },
      ],
    };
    aiClient.getUserContext.mockResolvedValueOnce(body);
    const user: AuthUser = { id: 'user_clerk_123', ai_enabled: true, plan: 'local_legend' };

    const result = await service.get(user);

    expect(aiClient.getUserContext).toHaveBeenCalledWith('user_clerk_123');
    expect(result).toEqual({ ...body, plan: 'local_legend' });
  });

  it('returns plan=null when the user has no plan set', async () => {
    const body: AiUserContext = {
      saved_places_count: 0,
      signal_tier: 'cold',
      chips: [],
    };
    aiClient.getUserContext.mockResolvedValueOnce(body);
    const user: AuthUser = { id: 'user_new', ai_enabled: true };

    const result = await service.get(user);

    expect(result).toEqual({ ...body, plan: null });
  });
});
