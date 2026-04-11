import { ConfigService } from '@nestjs/config';
import { AiServiceClient } from './ai-service.client';

describe('AiServiceClient', () => {
  let client: AiServiceClient;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'AI_SERVICE_BASE_URL') {
          return 'http://localhost:8000';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    client = new AiServiceClient(configService);
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

      expect(() => new AiServiceClient(configServiceNoUrl)).toThrow(
        'AI_SERVICE_BASE_URL is not configured'
      );
    });
  });

  describe('chat()', () => {
    it('should have chat method that accepts ChatRequestDto', async () => {
      expect(typeof client.chat).toBe('function');
      // We just verify the method exists and accepts the payload type
      // Full integration tests will be in the ChatService tests
    });
  });
});
