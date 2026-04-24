import { Controller, Delete, Get, HttpCode, HttpStatus } from '@nestjs/common';
import type { AuthUser, UserContextResponse } from '@totoro/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresAi } from '../common/decorators/requires-ai.decorator';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('context')
  @RequiresAi()
  async getContext(@CurrentUser() user: AuthUser): Promise<UserContextResponse> {
    return this.userService.getContext(user);
  }

  @Delete('data')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresAi()
  async deleteData(@CurrentUser() user: AuthUser): Promise<void> {
    await this.userService.deleteData(user.id);
  }
}
