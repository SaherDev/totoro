// Full consult flow — from component to NestJS
// Shows all layers + query vs mutation split

// ============================================================================
// LAYER 1: HttpClient interface (apps/web/src/api/types.ts)
// ============================================================================

interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
}

// ============================================================================
// LAYER 2: FetchClient class (apps/web/src/api/transports/fetch.transport.ts)
// ============================================================================

class FetchClient implements HttpClient {
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

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const token = await this.getToken()
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
    return res.json()
  }
}

// ============================================================================
// LAYER 3: getApiClient (apps/web/src/api/server.ts)
// ============================================================================

// import { auth } from '@clerk/nextjs/server'
//
// export async function getApiClient() {
//   const { getToken } = await auth()
//   return new FetchClient(process.env.NEXT_PUBLIC_API_URL!, getToken)
// }

// ============================================================================
// QUERY — plain async function, no 'use server'
// (apps/web/src/api/queries/places.query.ts)
// Next.js caching works normally on these
// ============================================================================

// import { getApiClient } from '../server'
//
// export async function getPlaces() {
//   const client = await getApiClient()
//   return client.get<Place[]>('/places')
// }

// ============================================================================
// MUTATION — 'use server' directive
// (apps/web/src/api/mutations/consult.mutation.ts)
// Called from forms and Client Components via Server Actions
// ============================================================================

// 'use server'
//
// import { getApiClient } from '../server'
//
// interface ConsultResponse {
//   primary: { place_name: string; address: string; reasoning: string; source: string }
//   alternatives: { place_name: string; address: string; reasoning: string; source: string }[]
//   reasoning_steps: { step: string; summary: string }[]
// }
//
// export async function consult(query: string, location?: { lat: number; lng: number }) {
//   const client = await getApiClient()
//   return client.post<ConsultResponse>('/recommendations/consult', { query, location })
// }

// ============================================================================
// SERVER COMPONENT — uses query directly (no 'use server' needed)
// ============================================================================

// import { getPlaces } from '@/api'
//
// export default async function PlacesPage() {
//   const places = await getPlaces()  // ← query, cached by Next.js
//   return (
//     <ul>
//       {places.map(p => <li key={p.id}>{p.place_name}</li>)}
//     </ul>
//   )
// }

// ============================================================================
// CLIENT COMPONENT — uses mutation via server action
// ============================================================================

// 'use client'
//
// import { useState } from 'react'
// import { consult } from '@/api'
//
// export function ConsultInput() {
//   const [query, setQuery] = useState('')
//   const [result, setResult] = useState(null)
//   const [loading, setLoading] = useState(false)
//
//   async function handleClick() {
//     setLoading(true)
//     try {
//       const data = await consult(query)  // ← mutation, server action
//       setResult(data)
//     } finally {
//       setLoading(false)
//     }
//   }
//
//   return (
//     <div>
//       <input value={query} onChange={e => setQuery(e.target.value)} />
//       <button onClick={handleClick} disabled={loading}>
//         {loading ? 'Thinking...' : 'Ask Totoro'}
//       </button>
//     </div>
//   )
// }
