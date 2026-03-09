import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '../common/decorators/public.decorator';
import { RequireAiGuard } from '../common/guards/require-ai.guard';
import { ClerkUser } from '../common/middleware/clerk.middleware';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: ClerkUser;
    }
  }
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  /**
   * Health check endpoint (public, no auth required)
   */
  @Get('health')
  @Public()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Protected route (requires valid Clerk token)
   */
  @Get('protected')
  protected(@Request() req) {
    return {
      message: 'Protected route accessed successfully',
      user: req.user,
    };
  }

  /**
   * Extract place endpoint (requires valid Clerk token + AI enabled)
   */
  @Post('extract-place')
  @UseGuards(RequireAiGuard)
  extractPlace(@Request() req) {
    return {
      message: 'Extract place endpoint (AI-gated)',
      user: req.user,
      endpoint: 'POST /extract-place',
    };
  }

  /**
   * Consult endpoint (requires valid Clerk token + AI enabled)
   */
  @Post('consult')
  @UseGuards(RequireAiGuard)
  consult(@Request() req) {
    return {
      message: 'Consult endpoint (AI-gated)',
      user: req.user,
      endpoint: 'POST /consult',
    };
  }
}
