/**
 * HTTP client interface — swappable transport layer.
 * Implementations: fetch, axios, GraphQL, etc.
 */
export interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  postStream(path: string, body: unknown): Promise<Response>
}
