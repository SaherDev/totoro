import { FetchTransport } from './transports/fetch.transport'

/**
 * Factory for creating the API client with a given token getter.
 * Token getter is provided at call time (from useAuth() in components
 * or from getToken() in server actions).
 */
export function createApiClient(getToken: () => Promise<string>) {
  return new FetchTransport(process.env.NEXT_PUBLIC_API_URL!, getToken)
}
