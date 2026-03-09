import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from 'svix';
import { ClerkWebhookController } from './clerk.webhook';

// Mock svix Webhook class
jest.mock('svix', () => {
  return {
    Webhook: jest.fn().mockImplementation(() => ({
      verify: jest.fn(),
    })),
  };
});

describe('ClerkWebhookController', () => {
  let controller: ClerkWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClerkWebhookController],
    }).compile();

    controller = module.get<ClerkWebhookController>(ClerkWebhookController);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  describe('handleClerkWebhook', () => {
    it('should verify webhook signature and handle user.created event', async () => {
      // Setup
      const mockSecret = 'whsec_test_secret';
      process.env.CLERK_WEBHOOK_SECRET = mockSecret;

      const mockUserId = 'user_123';
      const mockPayload = {
        type: 'user.created',
        data: {
          id: mockUserId,
          email: 'test@example.com',
        },
      };

      const mockReq = {
        rawBody: JSON.stringify(mockPayload),
        body: mockPayload,
        headers: {
          'svix-id': 'msg_test',
          'svix-timestamp': '1234567890',
          'svix-signature': 'v1,test_signature',
        },
      } as unknown as Request;

      // Mock svix Webhook.verify
      const mockVerify = jest.fn().mockReturnValue(mockPayload);
      (Webhook as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // Execute
      const result = await controller.handleClerkWebhook(
        mockReq as Parameters<typeof controller.handleClerkWebhook>[0],
      );

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockVerify).toHaveBeenCalledWith(
        JSON.stringify(mockPayload),
        mockReq.headers,
      );
    });

    it('should verify webhook signature and pass through other event types', async () => {
      // Setup
      const mockSecret = 'whsec_test_secret';
      process.env.CLERK_WEBHOOK_SECRET = mockSecret;

      const mockPayload = {
        type: 'user.updated',
        data: {
          id: 'user_123',
        },
      };

      const mockReq = {
        rawBody: JSON.stringify(mockPayload),
        body: mockPayload,
        headers: {
          'svix-id': 'msg_test',
          'svix-timestamp': '1234567890',
          'svix-signature': 'v1,test_signature',
        },
      } as unknown as Request;

      const mockVerify = jest.fn().mockReturnValue(mockPayload);
      (Webhook as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // Execute
      const result = await controller.handleClerkWebhook(
        mockReq as Parameters<typeof controller.handleClerkWebhook>[0],
      );

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockVerify).toHaveBeenCalled();
    });

    it('should reject webhook with invalid signature', async () => {
      // Setup
      const mockSecret = 'whsec_test_secret';
      process.env.CLERK_WEBHOOK_SECRET = mockSecret;

      const mockReq = {
        rawBody: 'invalid_body',
        body: {},
        headers: {
          'svix-id': 'msg_test',
          'svix-timestamp': '1234567890',
          'svix-signature': 'v1,invalid_signature',
        },
      } as unknown as Request;

      // Mock svix Webhook.verify to throw error
      const mockError = new Error('Signature verification failed');
      const mockVerify = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      (Webhook as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // Execute & Assert
      await expect(
        controller.handleClerkWebhook(
          mockReq as Parameters<typeof controller.handleClerkWebhook>[0],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when CLERK_WEBHOOK_SECRET is not configured', async () => {
      // Setup
      delete process.env.CLERK_WEBHOOK_SECRET;

      const mockReq = {
        rawBody: '{}',
        body: {},
        headers: {},
      } as unknown as Request;

      // Execute & Assert
      await expect(
        controller.handleClerkWebhook(
          mockReq as Parameters<typeof controller.handleClerkWebhook>[0],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fall back to JSON stringified body if rawBody is not available', async () => {
      // Setup
      const mockSecret = 'whsec_test_secret';
      process.env.CLERK_WEBHOOK_SECRET = mockSecret;

      const mockPayload = {
        type: 'user.created',
        data: { id: 'user_123' },
      };

      const mockReq = {
        // rawBody is undefined/missing
        body: mockPayload,
        headers: {
          'svix-id': 'msg_test',
          'svix-timestamp': '1234567890',
          'svix-signature': 'v1,test_signature',
        },
      } as unknown as Request;

      const mockVerify = jest.fn().mockReturnValue(mockPayload);
      (Webhook as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // Execute
      const result = await controller.handleClerkWebhook(
        mockReq as Parameters<typeof controller.handleClerkWebhook>[0],
      );

      // Assert
      expect(result).toEqual({ success: true });
      // Should use JSON.stringify(body) instead of rawBody
      expect(mockVerify).toHaveBeenCalledWith(
        JSON.stringify(mockPayload),
        mockReq.headers,
      );
    });

    it('should handle Webhook.verify throwing non-Error objects', async () => {
      // Setup
      const mockSecret = 'whsec_test_secret';
      process.env.CLERK_WEBHOOK_SECRET = mockSecret;

      const mockReq = {
        rawBody: '{}',
        body: {},
        headers: {},
      } as unknown as Request;

      // Mock svix Webhook.verify to throw a non-Error object
      const mockVerify = jest.fn().mockImplementation(() => {
        throw 'String error message';
      });
      (Webhook as jest.Mock).mockImplementation(() => ({
        verify: mockVerify,
      }));

      // Execute & Assert
      await expect(
        controller.handleClerkWebhook(
          mockReq as Parameters<typeof controller.handleClerkWebhook>[0],
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
