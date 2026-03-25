import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { pipeline } from 'node:stream';
import { ConsultRequestDto } from './dto/consult-request.dto';
import {
  IAiServiceClient,
  AI_SERVICE_CLIENT,
  AiConsultPayload,
} from '../ai-service/ai-service-client.interface';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service for handling consult requests
 * Supports both synchronous JSON responses and streaming Server-Sent Events
 *
 * Architecture:
 * - Non-streaming: Calls aiClient.consult(), returns JSON
 * - Streaming: Calls aiClient.consultStream(), pipes SSE to response
 * - Disconnect cleanup: req.on('close') destroys upstream connection
 * - Backpressure handling: Uses stream.pipeline() for safe composition
 *
 * ADR-016: Uses IAiServiceClient interface injected via DI
 * ADR-032: Controller is a pure facade; all logic lives here
 */
@Injectable()
export class ConsultService {
  private readonly logger = new Logger(ConsultService.name);

  constructor(
    @Inject(AI_SERVICE_CLIENT) private aiClient: IAiServiceClient,
    private prisma: PrismaService
  ) {}

  /**
   * Handle a consult request
   * Determines streaming vs. non-streaming based on dto.stream flag
   *
   * @param userId - User ID from Clerk auth (injected by controller)
   * @param dto - Validated request body
   * @param req - Express request (needed for disconnect detection)
   * @param res - Express response (will be written to by this method)
   */
  async handle(
    userId: string,
    dto: ConsultRequestDto,
    req: Request,
    res: Response
  ): Promise<void> {
    const isStreaming = dto.stream === true;

    if (isStreaming) {
      await this.handleStreaming(userId, dto, req, res);
    } else {
      await this.handleNonStreaming(userId, dto, res);
    }
  }

  /**
   * Handle non-streaming consult request
   * Calls aiClient.consult() and returns synchronous JSON response
   */
  private async handleNonStreaming(
    userId: string,
    dto: ConsultRequestDto,
    res: Response
  ): Promise<void> {
    try {
      const payload: AiConsultPayload = {
        user_id: userId,
        query: dto.query,
        location: dto.location,
        stream: false,
      };

      this.logger.debug(
        `Consult request from ${userId}: "${dto.query}" (non-streaming)`
      );

      const result = await this.aiClient.consult(payload);

      // Write recommendation record to database
      await this.prisma.recommendation.create({
        data: {
          userId,
          query: dto.query,
          data: result,
          shown: false,
          accepted: null,
          selectedPlaceId: null,
        },
      });

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handle streaming consult request
   * Calls aiClient.consultStream() and proxies SSE stream to response
   * Includes disconnect cleanup and backpressure handling
   */
  private async handleStreaming(
    userId: string,
    dto: ConsultRequestDto,
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering

      const payload: AiConsultPayload = {
        user_id: userId,
        query: dto.query,
        location: dto.location,
        stream: true,
      };

      this.logger.debug(
        `Consult request from ${userId}: "${dto.query}" (streaming)`
      );

      // Get upstream stream from AI service
      const upstream = await this.aiClient.consultStream(payload);

      // Disconnect cleanup (ADR-032)
      // When client closes connection, terminate upstream immediately
      req.on('close', () => {
        this.logger.debug(`Client disconnected, closing upstream connection`);
        upstream.destroy();
      });

      // Pipe upstream to response with error handling
      // stream.pipeline() handles backpressure automatically
      pipeline(upstream, res, (err) => {
        if (err) {
          // Only end response if it hasn't been ended already
          if (!res.writableEnded) {
            this.logger.error(`Stream pipeline error: ${err.message}`);
            res.end();
          }
        }
      });

      // Flush headers to start SSE stream
      res.flushHeaders();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Centralized error handling
   * Maps AI service errors to appropriate HTTP responses
   */
  private handleError(error: unknown, res: Response): void {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    this.logger.error(`Consult error: ${errorMessage}`);

    // Don't send response if it's already been sent
    if (!res.headersSent) {
      // Map common error patterns to HTTP status codes
      if (errorMessage.includes('timeout')) {
        res.status(504).json({ error: 'AI service timeout' });
      } else if (errorMessage.includes('Connection')) {
        res.status(503).json({ error: 'AI service unavailable' });
      } else if (errorMessage.includes('returned 4')) {
        res.status(400).json({ error: 'Invalid request to AI service' });
      } else if (errorMessage.includes('returned 5')) {
        res.status(503).json({ error: 'AI service error' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}
