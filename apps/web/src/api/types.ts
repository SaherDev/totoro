/**
 * HTTP client interface — swappable transport layer.
 * Implementations: fetch, axios, GraphQL, etc.
 *
 * Implementations are responsible for attaching the current location
 * snapshot from the location store to every POST body. Call sites do
 * not pass `location` explicitly; that concern lives in the transport.
 */
export interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T>
  postStream(path: string, body: unknown): Promise<Response>
  delete(path: string): Promise<void>
}
