import { getLocationSnapshot } from '../../store/locationStore'
import { HttpClient } from '../types'

/**
 * Error thrown by the HTTP transport. Carries the HTTP status so
 * callers can categorise (4xx vs 5xx) without parsing message strings.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: Record<string, unknown>,
  ) {
    super(`API error: ${status} ${statusText}`)
    this.name = 'HttpError'
  }
}

export class FetchClient implements HttpClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string>
  ) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  /**
   * POST a JSON body. Every outbound POST is augmented with the
   * current `location` snapshot (read from the in-memory location
   * store). When geolocation has not resolved or the user denied the
   * permission prompt, `location` is sent as `null` — the request is
   * never blocked on geolocation.
   */
  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(this.attachLocation(body)),
      signal,
    })
  }

  async postStream(path: string, body: unknown): Promise<Response> {
    return this.fetch(path, {
      method: 'POST',
      body: JSON.stringify(this.attachLocation(body)),
    })
  }

  private attachLocation(body: unknown): Record<string, unknown> {
    const base =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : { value: body }
    return { ...base, location: getLocationSnapshot() }
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const res = await this.fetch(path, options)

    if (!res.ok) {
      let body: Record<string, unknown> | undefined
      try {
        body = await res.json()
      } catch {
        // non-JSON error body — leave body undefined
      }
      throw new HttpError(res.status, res.statusText, body)
    }

    return res.json()
  }

  private async fetch(path: string, options: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...(await this.buildHeaders()),
        ...options.headers,
      },
    })
  }

  private async buildHeaders(): Promise<HeadersInit> {
    const token = await this.getToken()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  }
}
