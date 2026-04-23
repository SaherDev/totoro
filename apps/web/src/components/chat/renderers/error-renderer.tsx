import type { SseError } from '@totoro/shared';

export function ErrorRenderer({ data }: { data: SseError }) {
  return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
}
