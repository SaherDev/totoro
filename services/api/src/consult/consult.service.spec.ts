import { Test, TestingModule } from '@nestjs/testing';
import * as stream from 'node:stream';
import { ConsultService } from './consult.service';
import { AI_SERVICE_CLIENT, IAiServiceClient, AiConsultResponse } from '../ai-service/ai-service-client.interface';
import { ConsultRequestDto } from './dto/consult-request.dto';
import { RecommendationsRepository } from '../recommendations/recommendations.repository';

jest.mock('node:stream', () => ({
  ...jest.requireActual('node:stream'),
  pipeline: jest.fn((source, destination, callback) => {
    // Mock pipeline that doesn't actually call the destination
    callback();
  }),
}));

describe('ConsultService', () => {
  let service: ConsultService;
  let aiServiceClient: jest.Mocked<IAiServiceClient>;

  const aiServiceResponse: AiConsultResponse = {
    primary: {
      place_name: 'Ramen Shop',
      address: '123 Main St',
      reasoning: 'Your favorite spot',
      source: 'saved',
    },
    alternatives: [],
    reasoning_steps: [
      { step: 'intent_parsing', summary: 'Parsed: ramen' },
    ],
  };

  beforeEach(async () => {
    const mockAiServiceClient: jest.Mocked<IAiServiceClient> = {
      consult: jest.fn().mockResolvedValue(aiServiceResponse),
      consultStream: jest.fn().mockResolvedValue(Buffer.from('')),
    };

    const mockRecommendationsRepository = {
      create: jest.fn().mockResolvedValue({ id: 'rec-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultService,
        {
          provide: AI_SERVICE_CLIENT,
          useValue: mockAiServiceClient,
        },
        {
          provide: RecommendationsRepository,
          useValue: mockRecommendationsRepository,
        },
      ],
    }).compile();

    service = module.get<ConsultService>(ConsultService);
    aiServiceClient = module.get(AI_SERVICE_CLIENT);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handle() - non-streaming', () => {
    it('should call aiClient.consult() and return JSON response', async () => {
      const userId = 'user-123';
      const dto: ConsultRequestDto = {
        query: 'good ramen',
        location: { lat: 13.7, lng: 100.5 },
        stream: false,
      };
      const httpResponse = { json: jest.fn() } as any;
      const httpRequest = {} as any;

      await service.handle(userId, dto, httpRequest, httpResponse);

      expect(aiServiceClient.consult).toHaveBeenCalledWith({
        user_id: userId,
        query: dto.query,
        location: dto.location,
        stream: false,
      });
      expect(httpResponse.json).toHaveBeenCalledWith(aiServiceResponse);
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user-123';
      const dto: ConsultRequestDto = { query: 'ramen' };
      const httpResponse = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
        headersSent: false,
      } as any;
      const httpRequest = {} as any;

      aiServiceClient.consult.mockRejectedValue(new Error('Service timeout'));

      await service.handle(userId, dto, httpRequest, httpResponse);

      expect(httpResponse.status).toHaveBeenCalled();
    });
  });

  describe('handle() - streaming', () => {
    it('should set SSE headers and call aiClient.consultStream()', async () => {
      const userId = 'user-123';
      const dto: ConsultRequestDto = {
        query: 'sushi',
        stream: true,
      };
      const httpResponse = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn().mockReturnValue(true),
      } as any;
      const httpRequest = { on: jest.fn() } as any;
      const mockUpstream = { destroy: jest.fn() } as any;

      aiServiceClient.consultStream.mockResolvedValue(mockUpstream);

      await service.handle(userId, dto, httpRequest, httpResponse);

      expect(httpResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream'
      );
      expect(httpResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache'
      );
      expect(httpResponse.flushHeaders).toHaveBeenCalled();
      expect(aiServiceClient.consultStream).toHaveBeenCalledWith({
        user_id: userId,
        query: dto.query,
        stream: true,
      });
    });

    it('should cleanup upstream connection on client disconnect', async () => {
      const userId = 'user-123';
      const dto: ConsultRequestDto = { query: 'ramen', stream: true };
      const httpResponse = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
      } as any;
      let closeHandler: (() => void) | undefined;
      const httpRequest = {
        on: jest.fn().mockImplementation((event, handler) => {
          if (event === 'close') {
            closeHandler = handler;
          }
        }),
      } as any;
      const mockUpstream = { destroy: jest.fn() } as any;

      aiServiceClient.consultStream.mockResolvedValue(mockUpstream);

      await service.handle(userId, dto, httpRequest, httpResponse);

      // Simulate client disconnect
      if (closeHandler) {
        closeHandler();
      }

      expect(mockUpstream.destroy).toHaveBeenCalled();
    });
  });
});
