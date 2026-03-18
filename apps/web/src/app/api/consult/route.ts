import { getAuth } from '@clerk/nextjs/server'
import { createApiClient } from '@/api/client'
import type { NextRequest } from 'next/server'

// Singleton codec instances to avoid recreation on every transform
const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

interface ConsultRequestBody {
  messages?: Array<{
    role: string;
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
  }>;
}

export async function POST(request: NextRequest) {
  // Authenticate user — use getAuth(request) to read Clerk headers directly,
  // avoiding next/headers which is async-only in Next.js 16
  const { userId, getToken } = getAuth(request)
  if (!userId) {
    console.warn('[API] Consult request without authentication', {
      url: request.url,
      method: request.method,
    })
    return new Response('Unauthorized', { status: 401 })
  }

  // Parse request body and extract query
  let body: ConsultRequestBody
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  console.log('[API] consult body:', JSON.stringify(body, null, 2))

  const lastMsg = body.messages?.at(-1)
  // ai@6 stores text in parts[].text; fall back to content for older clients
  const query =
    lastMsg?.content ??
    lastMsg?.parts?.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('') ??
    ''

  console.log('[API] extracted query:', query)

  if (!query) {
    return new Response('No query provided', { status: 400 })
  }

  try {
    // Build API client using the token from the current session.
    // NEXT_PUBLIC_API_URL already includes /api/v1, so path is just /consult.
    const client = createApiClient(async () => {
      const token = await getToken()
      return token ?? ''
    })
    const upstream = await client.postStream('/consult', {
      query,
      stream: true,
    })

    // Get readable stream from response
    const upstreamBody = upstream.body
    if (!upstreamBody) {
      return new Response('Failed to establish stream', { status: 500 })
    }

    // Transform SSE stream to plain text stream
    const readable = upstreamBody.pipeThrough(
      new TransformStream({
        async transform(chunk, controller) {
          try {
            const text = textDecoder.decode(chunk)
            const lines = text.split('\n')

            for (const line of lines) {
              if (!line.trim()) continue

              // Parse SSE data line
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()

                if (!data) continue

                try {
                  const event = JSON.parse(data)

                  if (event.token !== undefined) {
                    // LLM token streaming: {"token": "..."}
                    controller.enqueue(textEncoder.encode(event.token))
                  } else if (event.done) {
                    // Stream complete: {"done": true}
                    controller.terminate()
                    return
                  }
                } catch {
                  // Skip invalid JSON events
                  console.debug('[API] Skipped invalid SSE event', { data })
                }
              }
            }
          } catch (transformError) {
            console.error('[API] Stream transformation error', { transformError })
            controller.error(transformError)
          }
        },
      })
    )

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('[API] Upstream call failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(`Upstream error: ${message}`, { status: 500 })
  }
}
