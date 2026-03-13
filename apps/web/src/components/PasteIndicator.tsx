"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useTranslations } from "next-intl";

interface PasteIndicatorProps {
  /** Ref to the input element to attach paste listener */
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  /** Duration to show indicator in milliseconds (default: 2000) */
  duration?: number;
  /** Custom className for the indicator card */
  className?: string;
  /** Callback when content is pasted */
  onPaste?: () => void;
}

export function PasteIndicator({
  inputRef,
  duration = 2000,
  className,
  onPaste,
}: PasteIndicatorProps) {
  const t = useTranslations("chat");
  const [showIndicator, setShowIndicator] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePaste = () => {
    setShowIndicator(true);
    onPaste?.();

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-hide after specified duration
    timeoutRef.current = setTimeout(() => {
      setShowIndicator(false);
    }, duration);
  };

  // Attach paste listener to input
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.addEventListener("paste", handlePaste);
    return () => {
      input.removeEventListener("paste", handlePaste);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, onPaste]);

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={className || "absolute -top-12 left-0 pointer-events-none"}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background shadow-sm">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-xs font-medium text-foreground">
              {t("pasted")}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
