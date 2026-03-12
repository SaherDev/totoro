import { cn } from "@totoro/ui";
import { motion } from "framer-motion";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  className?: string;
}

function ChatMessage({ role, content, isStreaming, className }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <motion.div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 font-body text-sm leading-relaxed md:max-w-[70%]",
          isUser
            ? "bg-primary text-primary-foreground rounded-ee-md"
            : "bg-card border border-border text-card-foreground rounded-es-md shadow-totoro-sm"
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {isStreaming && (
          <span className="inline-flex gap-1 mt-1 ms-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:300ms]" />
          </span>
        )}
      </div>
    </motion.div>
  );
}

export { ChatMessage };
