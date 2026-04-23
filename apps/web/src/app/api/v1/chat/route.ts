import { type NextRequest, NextResponse } from 'next/server';

const NESTJS_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1').replace(/\/api\/v1\/?$/, '');

export async function POST(request: NextRequest) {
  const auth = request.headers.get('Authorization') ?? '';
  const body = await request.text();

  // Abort the upstream fetch when the client disconnects
  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort());

  let upstream: Response;
  try {
    upstream = await fetch(`${NESTJS_BASE}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body,
      signal: abort.signal,
      // @ts-expect-error — Node 18 fetch supports duplex for streaming
      duplex: 'half',
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(await upstream.text(), { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
