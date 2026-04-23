import type { SseToolResult } from '@totoro/shared';

export function ToolResultRenderer({ data }: { data: SseToolResult }) {
  return <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>;
}
