"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useTranslations } from "next-intl";

interface PastePreviewProps {
  /** The pasted content to display */
  content: string | null;
  /** Max length to show before truncating (default: 200) */
  maxLength?: number;
}

export function PastePreview({ content, maxLength = 200 }: PastePreviewProps) {
  const t = useTranslations("chat");
  const isVisible = !!content;

  const isTruncated = content && content.length > maxLength;
  const displayContent = content
    ? isTruncated
      ? content.substring(0, maxLength) + "..."
      : content
    : "";

  const pasted: string = t("pasted");

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
        >
          {/* Paste card */}
          <div className="shrink-0 rounded-xl border border-border bg-white dark:bg-zinc-900 p-2.5 w-36 text-start">
            {/* Content preview */}
            <div className="mb-2 max-h-24 overflow-hidden">
              <pre className="text-[9px] font-mono text-muted-foreground whitespace-pre-wrap break-words leading-tight">
                {displayContent}
              </pre>
            </div>

            {/* PASTED badge */}
            <div className="inline-flex items-center rounded border border-border px-1.5 py-px">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                {pasted}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
