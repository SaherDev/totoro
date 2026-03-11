// Full API client flow — ADR-029
// Each section maps to a real file in apps/web/src/api/

// === apps/web/src/api/types.ts ===

export interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
}

// === apps/web/src/api/transports/fetch.transport.ts ===

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

// === apps/web/src/api/server.ts ===
// import { auth } from '@clerk/nextjs/server'

async function getApiClient() {
  // const { getToken } = await auth()
  // return new FetchClient(process.env.NEXT_PUBLIC_API_URL!, getToken)
}

// === apps/web/src/api/queries/places.query.ts ===
// Plain async function — no 'use server'. Next.js caching works normally.

interface Place {
  id: string
  place_name: string
  address: string
}

async function getPlaces(): Promise<Place[]> {
  const client = await getApiClient() as any
  return client.get<Place[]>('/places')
}

// === apps/web/src/api/mutations/consult.mutation.ts ===
// 'use server' — called from Client Components via Server Actions

interface ConsultResponse {
  primary: { place_name: string; address: string; reasoning: string; source: string }
  alternatives: { place_name: string; address: string; reasoning: string; source: string }[]
  reasoning_steps: { step: string; summary: string }[]
}

async function consult(
  query: string,
  location?: { lat: number; lng: number }
): Promise<ConsultResponse> {
  const client = await getApiClient() as any
  return client.post<ConsultResponse>('/recommendations/consult', { query, location })
}

// === apps/web/src/app/places/page.tsx ===
// Server Component — no 'use client', just await and render
//
// import { getPlaces } from '@/api'
//
// export default async function PlacesPage() {
//   const places = await getPlaces()
//   return (
//     <ul>
//       {places.map(p => <li key={p.id}>{p.place_name}</li>)}
//     </ul>
//   )
// }

// === apps/web/src/app/consult/consult-input.tsx ===
// Client Component — calls 'use server' mutation, renders result
// consult() runs on the server, Next.js bridges the call automatically
//
// 'use client'
//
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
//       const data = await consult(query)
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
