import type { UserContextResponse } from '@totoro/shared';
import { UserContextController } from './user-context.controller';
import { UserContextService } from './user-context.service';

describe('UserContextController', () => {
  let controller: UserContextController;
  let service: jest.Mocked<UserContextService>;

  beforeEach(() => {
    service = { get: jest.fn() } as unknown as jest.Mocked<UserContextService>;
    controller = new UserContextController(service);
  });

  it('is a facade — one service call with the authed userId, return value forwarded', async () => {
    const body: UserContextResponse = {
      saved_places_count: 0,
      signal_tier: 'cold',
      chips: [],
    };
    service.get.mockResolvedValueOnce(body);

    const result = await controller.get('user_clerk_123');

    expect(service.get).toHaveBeenCalledTimes(1);
    expect(service.get).toHaveBeenCalledWith('user_clerk_123');
    expect(result).toEqual(body);
  });
});
