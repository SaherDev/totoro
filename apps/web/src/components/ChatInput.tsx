"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Send,
  Volume2,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@totoro/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@totoro/ui";
import { useRef, useState } from "react";

import { cn } from "@totoro/ui";
import { useTranslations } from "next-intl";
import { PastePreview } from "./PastePreview";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onVoiceModeChange?: (active: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
}

function ChatInput({
  onSubmit,
  disabled,
  placeholder,
  className,
  onVoiceModeChange,
  onListeningChange,
}: ChatInputProps) {
  const t = useTranslations("chat");
  const [hasContent, setHasContent] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [pastedItems, setPastedItems] = useState<Array<{ id: string; content: string }>>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = inputRef.current?.value.trim() ?? "";
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "auto";
    }
    setHasContent(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 240) + "px";
      setHasContent(inputRef.current.value.trim().length > 0);
    }
  };

  const toggleVoiceMode = () => {
    const next = !isVoiceMode;
    setIsVoiceMode(next);
    // Start listening immediately when entering voice mode
    setIsListening(next);
    onVoiceModeChange?.(next);
    onListeningChange?.(next);
  };

  const toggleListening = () => {
    if (isListening) {
      // Muting closes voice mode entirely
      setIsListening(false);
      setIsVoiceMode(false);
      onListeningChange?.(false);
      onVoiceModeChange?.(false);
    } else {
      setIsListening(true);
      onListeningChange?.(true);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    try {
      const pastedText = e.clipboardData.getData("text/plain");

      if (pastedText && pastedText.trim()) {
        const id = `paste-${Date.now()}`;

        // Add new paste to list
        setPastedItems((prev) => [...prev, { id, content: pastedText }]);
      }
    } catch (err) {
      console.error("❌ Error accessing clipboard:", err);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Voice mode */}
      <AnimatePresence>
        {isVoiceMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center gap-3 pt-3 pb-1"
          >
            <motion.div
              className="relative w-20 h-20 rounded-full"
              animate={isListening ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div
                className={cn(
                  "w-full h-full rounded-full transition-all duration-500",
                  isListening
                    ? "bg-gradient-to-br from-accent via-primary to-accent/60 shadow-lg"
                    : "bg-muted",
                )}
              />
              <button
                onClick={toggleListening}
                className="absolute inset-0 flex items-center justify-center"
              >
                {isListening ? (
                  <MicOff className="w-7 h-7 text-primary-foreground" />
                ) : (
                  <Mic className="w-7 h-7 text-muted-foreground" />
                )}
              </button>
            </motion.div>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <span className="font-body text-sm text-muted-foreground">
                {isListening ? t("listening") : t("startTalking")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex flex-col gap-3 p-1">
        {/* Paste previews - horizontal scroll */}
        {pastedItems.length > 0 && (
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2">
            {pastedItems.map((item) => (
              <PastePreview key={item.id} content={item.content} />
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={placeholder || t("placeholder")}
          disabled={disabled || isVoiceMode}
          rows={1}
          suppressHydrationWarning
          className={cn(
            "w-full resize-none bg-transparent px-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50",
            isVoiceMode && "opacity-30",
          )}
        />

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          {/* Plus button */}
          <div suppressHydrationWarning>
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all duration-200 hover:bg-muted/80"
                      suppressHydrationWarning
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="rounded-lg bg-foreground text-background font-body text-xs px-3 py-1.5"
                >
                  {t("attach")}
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                side="top"
                align="start"
                className="w-auto p-1.5 rounded-2xl border-border/50 bg-popover shadow-lg"
              >
                <div className="flex flex-col gap-0.5">
                  <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-foreground hover:bg-muted transition-colors">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    {t("attachFile")}
                  </button>
                  <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-foreground hover:bg-muted transition-colors">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    {t("takePhoto")}
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1" />

          {/* Mic toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleVoiceMode}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
                  isVoiceMode
                    ? "bg-accent text-accent-foreground shadow-totoro-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {isVoiceMode ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="rounded-lg bg-foreground text-background font-body text-xs px-3 py-1.5"
            >
              {isVoiceMode ? t("exitVoice") : t("voiceMode")}
            </TooltipContent>
          </Tooltip>

          {/* Speaker toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsSpeakerOn((s) => !s)}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
                  isSpeakerOn
                    ? "bg-accent text-accent-foreground shadow-totoro-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="rounded-lg bg-foreground text-background font-body text-xs px-3 py-1.5"
            >
              {isSpeakerOn ? t("speakerOn") : t("speakerOff")}
            </TooltipContent>
          </Tooltip>

          {/* Send / Close */}
          {isVoiceMode ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleVoiceMode}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all duration-200 hover:bg-muted/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="rounded-lg bg-foreground text-background font-body text-xs px-3 py-1.5"
              >
                {t("close")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSubmit}
                  disabled={disabled || !hasContent}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all duration-200",
                    hasContent
                      ? "bg-primary text-primary-foreground shadow-totoro-sm hover:shadow-totoro-md active:scale-95"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="rounded-lg bg-foreground text-background font-body text-xs px-3 py-1.5"
              >
                {t("send")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export { ChatInput };
