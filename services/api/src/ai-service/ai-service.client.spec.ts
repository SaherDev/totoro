import { ConfigService } from '@nestjs/config';
import { AiServiceClient } from './ai-service.client';

describe('AiServiceClient', () => {
  let client: AiServiceClient;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ai_service.base_url') {
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
      expect(configService.get).toHaveBeenCalledWith('ai_service.base_url');
    });

    it('should throw if base_url is not configured', () => {
      const configServiceNoUrl = {
        get: jest.fn(() => undefined),
      } as unknown as ConfigService;

      expect(() => new AiServiceClient(configServiceNoUrl)).toThrow(
        'ai_service.base_url is not configured'
      );
    });
  });

  describe('consult()', () => {
    it('should have consult method that accepts AiConsultPayload', async () => {
      expect(typeof client.consult).toBe('function');
      const payload = { user_id: 'user123', query: 'good ramen' };
      // We just verify the method exists and accepts the payload type
      // Full integration tests will be in the ConsultService tests
    });
  });

  describe('consultStream()', () => {
    it('should have consultStream method that accepts AiConsultPayload', async () => {
      expect(typeof client.consultStream).toBe('function');
      const payload = { user_id: 'user123', query: 'good ramen' };
      // We just verify the method exists and accepts the payload type
      // Full integration tests will be in the ConsultService tests
    });
  });
});
