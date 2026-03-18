import { auth } from '@clerk/nextjs/server'
import { getApiClient } from '@/api/server'

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

export async function POST(request: Request) {
  // Authenticate user
  const { userId } = await auth()
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
    // Call NestJS endpoint for streaming.
    // NEXT_PUBLIC_API_URL already includes /api/v1, so path is just /consult.
    const client = getApiClient()
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

              // Handle [DONE] marker
              if (line.includes('[DONE]')) {
                controller.terminate()
                return
              }

              // Parse SSE data line
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()

                // Skip if not JSON or empty
                if (!data || data === '[DONE]') {
                  continue
                }

                try {
                  const event = JSON.parse(data)

                  // Extract content from token events only
                  if (event.type === 'token' && event.content) {
                    controller.enqueue(textEncoder.encode(event.content))
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
