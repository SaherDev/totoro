import { FetchClient } from './transports/fetch.transport'

/**
 * Server-side: use getApiClient() from ./server.ts
 * Client-side: use useApiClient() from ./hooks.ts
 */
export function createApiClient(getToken: () => Promise<string>) {
  return new FetchClient(process.env.NEXT_PUBLIC_API_URL!, getToken)
}
