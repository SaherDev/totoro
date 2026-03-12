'use client';

import { useAuth } from '@clerk/nextjs';
import { createApiClient } from './client';

/**
 * Client-side hook for API communication
 * Wraps createApiClient with Clerk token retrieval
 */
export function useApiClient() {
  const { getToken } = useAuth();
  return createApiClient(async () => {
    const token = await getToken();
    return token ?? '';
  });
}
