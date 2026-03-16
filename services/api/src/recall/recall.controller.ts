import { Controller, Post, Body, Request, HttpCode } from '@nestjs/common';
import { RecallService } from './recall.service';
import { RecallRequestDto } from './dto/recall-request.dto';
import { RecallResponseDto } from './dto/recall-response.dto';
import { ClerkUser } from '../common/middleware/clerk.middleware';

@Controller('recall')
export class RecallController {
  constructor(private readonly recallService: RecallService) {}

  @Post()
  @HttpCode(501)
  async recall(@Request() req, @Body() dto: RecallRequestDto): Promise<RecallResponseDto> {
    const user = req.user as ClerkUser;
    return this.recallService.recall(user.id, dto);
  }
}
