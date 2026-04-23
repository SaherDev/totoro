import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { PassThrough } from 'stream';
import type { AxiosResponse } from 'axios';
import {
  ChatRequestDto,
  SignalRequestWithUser,
  SignalResponse,
  UserContextResponse,
} from '@totoro/shared';
import { AiServiceClient } from './ai-service.client';

describe('AiServiceClient', () => {
  let client: AiServiceClient;
  let configService: ConfigService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'AI_SERVICE_BASE_URL') {
          return 'http://localhost:8000';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    client = new AiServiceClient(configService, httpService);
  });

  describe('initialization', () => {
    it('should initialize with valid base URL', () => {
      expect(client).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('AI_SERVICE_BASE_URL');
    });

    it('should throw if base_url is not configured', () => {
      const configServiceNoUrl = {
        get: jest.fn(() => undefined),
      } as unknown as ConfigService;

      expect(
        () => new AiServiceClient(configServiceNoUrl, httpService)
      ).toThrow('AI_SERVICE_BASE_URL is not configured');
    });
  });

  describe('chatStream()', () => {
    const payload: ChatRequestDto = {
      user_id: 'user_abc',
      message: 'good ramen nearby',
      location: null,
      signal_tier: null,
    };

    it('calls POST /v1/chat/stream with responseType: stream and returns the body stream', async () => {
      const fakeStream = new PassThrough();
      const response = { data: fakeStream } as unknown as AxiosResponse;
      httpService.post.mockReturnValueOnce(of(response));

      const result = await client.chatStream(payload);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/v1/chat/stream',
        payload,
        { responseType: 'stream', timeout: 30000, signal: undefined }
      );
      expect(result).toBe(fakeStream);
    });

    it('forwards AbortSignal to axios so the upstream connection is cancelled on abort', async () => {
      const fakeStream = new PassThrough();
      const response = { data: fakeStream } as unknown as AxiosResponse;
      httpService.post.mockReturnValueOnce(of(response));

      const controller = new AbortController();
      await client.chatStream(payload, controller.signal);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/v1/chat/stream',
        payload,
        { responseType: 'stream', timeout: 30000, signal: controller.signal }
      );
    });

    it('propagates upstream errors raw so AllExceptionsFilter can translate them', async () => {
      const upstream = Object.assign(new Error('upstream 503'), {
        isAxiosError: true,
        response: { status: 503 },
      });
      httpService.post.mockImplementationOnce(() => { throw upstream; });

      await expect(client.chatStream(payload)).rejects.toBe(upstream);
    });
  });

  describe('postSignal()', () => {
    const payload: SignalRequestWithUser = {
      signal_type: 'recommendation_accepted',
      user_id: 'user_abc',
      recommendation_id: 'rec_123',
      place_id: 'google:xyz',
    };

    it('forwards to POST /v1/signal with the enriched payload and 30s timeout', async () => {
      const body: SignalResponse = { status: 'accepted' };
      const response = { data: body } as AxiosResponse<SignalResponse>;
      httpService.post.mockReturnValueOnce(of(response));

      const result = await client.postSignal(payload);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/v1/signal',
        payload,
        { timeout: 30000 }
      );
      expect(result).toEqual(body);
    });

    it('propagates upstream errors raw (so AllExceptionsFilter can translate 404)', async () => {
      const upstream = Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: { status: 404, data: { detail: 'Recommendation not found' } },
      });
      httpService.post.mockImplementationOnce(() => {
        throw upstream;
      });

      await expect(client.postSignal(payload)).rejects.toBe(upstream);
    });
  });

  describe('getUserContext()', () => {
    it('forwards to GET /v1/user/context with user_id as a query param', async () => {
      const body: UserContextResponse = {
        saved_places_count: 3,
        signal_tier: 'active',
        chips: [
          {
            label: 'Japanese',
            source_field: 'subcategory',
            source_value: 'japanese',
            signal_count: 2,
            status: 'confirmed',
            selection_round: null,
          },
        ],
      };
      const response = { data: body } as AxiosResponse<UserContextResponse>;
      httpService.get.mockReturnValueOnce(of(response));

      const result = await client.getUserContext('user_abc');

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:8000/v1/user/context',
        { params: { user_id: 'user_abc' }, timeout: 30000 }
      );
      expect(result).toEqual(body);
    });

    it('passes through a cold-start response unchanged', async () => {
      const body: UserContextResponse = {
        saved_places_count: 0,
        signal_tier: 'cold',
        chips: [],
      };
      const response = { data: body } as AxiosResponse<UserContextResponse>;
      httpService.get.mockReturnValueOnce(of(response));

      const result = await client.getUserContext('user_new');

      expect(result).toEqual(body);
    });
  });
});
