import { FetchClient } from './transports/fetch.transport'

/**
 * Server-side: use getApiClient() from ./server.ts
 * Client-side: use useApiClient() from ./hooks.ts
 */
export function createApiClient(getToken: () => Promise<string>) {
  // NEXT_PUBLIC_API_URL is set in .env.local and required for app functionality
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return new FetchClient(process.env.NEXT_PUBLIC_API_URL!, getToken)
}
