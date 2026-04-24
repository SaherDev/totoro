import type { AuthUser, UserContextResponse } from '@totoro/shared';
import { UserContextController } from './user-context.controller';
import { UserContextService } from './user-context.service';

describe('UserContextController', () => {
  let controller: UserContextController;
  let service: jest.Mocked<UserContextService>;

  beforeEach(() => {
    service = { get: jest.fn() } as unknown as jest.Mocked<UserContextService>;
    controller = new UserContextController(service);
  });

  it('is a facade — one service call with the authed user, return value forwarded', async () => {
    const body: UserContextResponse = {
      saved_places_count: 0,
      signal_tier: 'cold',
      chips: [],
      plan: 'homebody',
    };
    service.get.mockResolvedValueOnce(body);
    const user: AuthUser = { id: 'user_clerk_123', ai_enabled: true, plan: 'homebody' };

    const result = await controller.get(user);

    expect(service.get).toHaveBeenCalledTimes(1);
    expect(service.get).toHaveBeenCalledWith(user);
    expect(result).toEqual(body);
  });
});
