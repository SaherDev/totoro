'use client';

import { useEffect, useState } from 'react';

interface AssistantBubbleProps {
  message: string;
}

export function AssistantBubble({ message }: AssistantBubbleProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="flex transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
