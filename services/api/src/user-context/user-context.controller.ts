import { Controller, Get } from '@nestjs/common';
import type { AuthUser, UserContextResponse } from '@totoro/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresAi } from '../common/decorators/requires-ai.decorator';
import { UserContextService } from './user-context.service';

@Controller('user/context')
export class UserContextController {
  constructor(private readonly userContextService: UserContextService) {}

  @Get()
  @RequiresAi()
  async get(@CurrentUser() user: AuthUser): Promise<UserContextResponse> {
    return this.userContextService.get(user);
  }
}
