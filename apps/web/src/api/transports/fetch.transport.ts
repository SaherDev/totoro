import { HttpClient } from '../types'

export class FetchClient implements HttpClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string>
  ) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' })
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async postStream(path: string, body: unknown): Promise<Response> {
    const res = await this.fetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`)
    }

    return res
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const res = await this.fetch(path, options)

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`)
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
