import { auth } from '@clerk/nextjs/server'
import { getApiClient } from '@/api/server'

export async function POST(request: Request) {
  // Authenticate user
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Parse request body and extract query
  let body
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const query = body.messages?.at(-1)?.content ?? ''
  if (!query) {
    return new Response('No query provided', { status: 400 })
  }

  try {
    // Call NestJS endpoint for streaming
    const client = getApiClient()
    const upstream = await client.postStream('/api/v1/consult', {
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
          const text = new TextDecoder().decode(chunk)
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
                  controller.enqueue(new TextEncoder().encode(event.content))
                }
              } catch {
                // Skip invalid JSON events
              }
            }
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
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(`Upstream error: ${message}`, { status: 500 })
  }
}
