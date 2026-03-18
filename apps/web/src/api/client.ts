import { FetchClient } from './transports/fetch.transport'

/**
 * Creates an authenticated API client using the provided token getter.
 * Pass getAuth(request).getToken in route handlers.
 */
export function createApiClient(getToken: () => Promise<string>) {
  // NEXT_PUBLIC_API_URL is set in .env.local and required for app functionality
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return new FetchClient(process.env.NEXT_PUBLIC_API_URL!, getToken)
}
