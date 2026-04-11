'use client';

import { useEffect, useState } from 'react';

interface ClarificationHintProps {
  message: string | null;
}

export function ClarificationHint({ message }: ClarificationHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    // 150ms fade-in on mount when non-null
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <p
      className="text-center text-sm italic text-muted-foreground transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {message}
    </p>
  );
}
