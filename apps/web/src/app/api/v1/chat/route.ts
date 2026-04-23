import { type NextRequest, NextResponse } from 'next/server';

// Strip /api/v1 suffix to get the NestJS base URL
const NESTJS_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1').replace(/\/api\/v1\/?$/, '');

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization') ?? '';
  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${NESTJS_BASE}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body,
      // @ts-expect-error — Node 18 fetch supports duplex for streaming
      duplex: 'half',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(await upstream.text(), { status: upstream.status });
  }

  // Stream the SSE body back to the browser without buffering
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
