'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type AssistantBubbleType = 'clarification' | 'assistant';

interface AssistantBubbleProps {
  message: string;
  timestamp: number;
  type?: AssistantBubbleType;
  onDismiss?: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AssistantBubble({ message, timestamp, type = 'assistant', onDismiss }: AssistantBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [message]);

  const isClarification = type === 'clarification';
  const bgColor = isClarification ? 'bg-amber-50 dark:bg-amber-950' : 'bg-muted';
  const textColor = isClarification ? 'text-amber-950 dark:text-amber-100' : 'text-foreground';

  return (
    <div
      className="group flex flex-col items-start gap-1 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className={`max-w-[80%] rounded-2xl rounded-bl-sm ${bgColor} px-4 py-3`}>
        <div className={`text-sm ${textColor} leading-relaxed`}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="my-1 list-disc ps-4 flex flex-col gap-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 list-decimal ps-4 flex flex-col gap-0.5">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-80 hover:opacity-100">
                  {children}
                </a>
              ),
            }}
          >
            {message}
          </ReactMarkdown>
        </div>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
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
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
