'use client';

import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface UserBubbleProps {
  content: string;
  timestamp: number;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UserBubble({ content, timestamp }: UserBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [content]);

  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-4 py-3">
        <p className="break-all text-sm text-accent-foreground">{content}</p>
      </div>
      <div className="flex items-center gap-2 ps-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={copy}
          className="hover:text-foreground transition-colors"
          aria-label="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <time className="text-[11px] tabular-nums" dateTime={new Date(timestamp).toISOString()}>
          {formatTime(timestamp)}
        </time>
      </div>
    </div>
  );
}
