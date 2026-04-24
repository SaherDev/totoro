import type { AuthUser, UserContextResponse } from '@totoro/shared';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(() => {
    service = {
      getContext: jest.fn(),
      deleteData: jest.fn(),
    } as unknown as jest.Mocked<UserService>;
    controller = new UserController(service);
  });

  describe('GET /user/context', () => {
    it('is a facade — one service call with the authed user, return value forwarded', async () => {
      const body: UserContextResponse = {
        saved_places_count: 0,
        signal_tier: 'cold',
        chips: [],
        plan: 'homebody',
      };
      service.getContext.mockResolvedValueOnce(body);
      const user: AuthUser = { id: 'user_clerk_123', ai_enabled: true, plan: 'homebody' };

      const result = await controller.getContext(user);

      expect(service.getContext).toHaveBeenCalledTimes(1);
      expect(service.getContext).toHaveBeenCalledWith(user);
      expect(result).toEqual(body);
    });
  });

  describe('DELETE /user/data', () => {
    it('is a facade — forwards the authed user id to the service', async () => {
      service.deleteData.mockResolvedValueOnce(undefined);
      const user: AuthUser = { id: 'user_clerk_123', ai_enabled: true };

      const result = await controller.deleteData(user);

      expect(service.deleteData).toHaveBeenCalledTimes(1);
      expect(service.deleteData).toHaveBeenCalledWith('user_clerk_123');
      expect(result).toBeUndefined();
    });
  });
});
