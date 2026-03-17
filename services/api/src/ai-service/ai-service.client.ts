import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';
import { Readable } from 'node:stream';
import {
  IAiServiceClient,
  AiConsultPayload,
  AiConsultResponse,
} from './ai-service-client.interface';

/**
 * HTTP client for communicating with the AI service (totoro-ai)
 *
 * Implementation details:
 * - Uses Node's built-in http/https module (no external dependencies)
 * - Parses base URL to determine protocol (http or https)
 * - Implements two methods: consult() for synchronous requests, consultStream() for SSE
 * - Sets 20s timeout for all requests (per api-contract.md)
 * - Handles connection cleanup and error cases
 *
 * ADR-016: First concrete implementation of AiServiceClient pattern
 * ADR-033: Injected via IAiServiceClient interface, not this class directly
 */
@Injectable()
export class AiServiceClient implements IAiServiceClient {
  private readonly logger = new Logger(AiServiceClient.name);
  private readonly baseUrl: string;
  private readonly request:
    | typeof http.request
    | typeof https.request;
  private readonly protocol: 'http:' | 'https:';

  constructor(configService: ConfigService) {
    this.baseUrl = configService.get<string>('ai_service.base_url');
    if (!this.baseUrl) {
      throw new Error('ai_service.base_url is not configured');
    }

    const url = new URL(this.baseUrl);
    this.protocol = url.protocol as 'http:' | 'https:';
    this.request =
      this.protocol === 'https:' ? https.request : http.request;

    this.logger.debug(
      `Initialized with base URL: ${this.baseUrl}, protocol: ${this.protocol}`
    );
  }

  /**
   * Make a synchronous consult request to the AI service
   * Collects the response body and parses it as JSON
   */
  async consult(payload: AiConsultPayload): Promise<AiConsultResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL('/v1/consult', this.baseUrl);
      const body = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port || (this.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 20000, // 20s timeout per api-contract.md
      };

      const req = this.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (e) {
              reject(
                new Error(
                  `Failed to parse AI service response: ${e instanceof Error ? e.message : String(e)}`
                )
              );
            }
          } else {
            reject(
              new Error(
                `AI service returned ${res.statusCode}: ${data}`
              )
            );
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('AI service request timeout (20s)'));
      });

      req.on('error', (e) => {
        reject(
          new Error(
            `Failed to connect to AI service: ${e instanceof Error ? e.message : String(e)}`
          )
        );
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Make a streaming consult request to the AI service
   * Returns a Readable stream of Server-Sent Events
   * Used when client requests stream: true
   */
  async consultStream(
    payload: AiConsultPayload
  ): Promise<Readable> {
    return new Promise((resolve, reject) => {
      const url = new URL('/v1/consult', this.baseUrl);
      const payloadWithStream = { ...payload, stream: true };
      const body = JSON.stringify(payloadWithStream);

      const options = {
        hostname: url.hostname,
        port: url.port || (this.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 20000, // 20s timeout per api-contract.md
      };

      const req = this.request(options, (res) => {
        if (res.statusCode === 200) {
          // Return the response stream directly
          // The caller (ConsultService) will pipe this to the response
          resolve(res);
        } else {
          // Collect error response body
          let errorData = '';
          res.on('data', (chunk) => {
            errorData += chunk;
          });
          res.on('end', () => {
            reject(
              new Error(
                `AI service returned ${res.statusCode}: ${errorData}`
              )
            );
          });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('AI service request timeout (20s)'));
      });

      req.on('error', (e) => {
        reject(
          new Error(
            `Failed to connect to AI service: ${e instanceof Error ? e.message : String(e)}`
          )
        );
      });

      req.write(body);
      req.end();
    });
  }
}
