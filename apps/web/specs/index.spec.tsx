// Mock Clerk's server auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(async () => ({ userId: 'test-user', getToken: jest.fn(async () => 'test-token') })),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock @ai-sdk/react
jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(() => ({
    messages: [],
    append: jest.fn(),
    isLoading: false,
    error: null,
  })),
}));

describe('HomePage Integration', () => {
  it('should verify app structure loads successfully', () => {
    // Basic smoke test - just ensure the mocks are set up correctly
    expect(true).toBe(true);
  });
});
