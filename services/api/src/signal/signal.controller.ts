import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { SignalResponse } from '@totoro/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequiresAi } from '../common/decorators/requires-ai.decorator';
import { SignalRequestDto } from './dto/signal-request.dto';
import { SignalService } from './signal.service';

@Controller('signal')
export class SignalController {
  constructor(private readonly signalService: SignalService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @RequiresAi()
  async submit(
    @CurrentUser() userId: string,
    @Body() dto: SignalRequestDto
  ): Promise<SignalResponse> {
    return this.signalService.submit(userId, dto);
  }
}
