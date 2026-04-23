import type { SseMessage } from '@totoro/shared';

export function MessageRenderer({ data }: { data: SseMessage }) {
  return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
}
