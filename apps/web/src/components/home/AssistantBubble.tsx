'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type AssistantBubbleType = 'clarification' | 'assistant';

interface AssistantBubbleProps {
  message: string;
  type?: AssistantBubbleType;
  onDismiss?: () => void;
}

export function AssistantBubble({ message, type = 'assistant', onDismiss }: AssistantBubbleProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const isClarification = type === 'clarification';
  const bgColor = isClarification ? 'bg-amber-50 dark:bg-amber-950' : 'bg-muted';
  const textColor = isClarification ? 'text-amber-950 dark:text-amber-100' : 'text-foreground';

  return (
    <div
      className="flex gap-2 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className={`max-w-[80%] rounded-2xl rounded-bl-sm ${bgColor} px-4 py-3 flex-1`}>
        <p className={`text-sm ${textColor} leading-relaxed`}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 mt-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
