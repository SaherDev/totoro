import {
  Controller,
  Get,
  Post,
  Request,
} from '@nestjs/common';
import { AppService } from './app.service';
import { RequiresAi } from '../common/decorators/requires-ai.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  /**
   * Health check endpoint (public, no auth required)
   * Public routes are determined by auth.public_paths in config, not decorators.
   */
  @Get('health')
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
}
