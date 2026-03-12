import { cn } from "@totoro/ui";
import { useTranslations } from "next-intl";

interface ReasoningBlockProps {
  reasoning: string;
  className?: string;
}

export function ReasoningBlock({ reasoning, className }: ReasoningBlockProps) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "relative ps-4 py-3 pe-3 rounded-xl bg-secondary/60 border-s-[3px] border-accent",
        "font-body text-sm text-muted-foreground leading-relaxed",
        className
      )}
    >
      <span className="block text-xs font-medium text-accent mb-1 uppercase tracking-wider">
        {t("place.whyThisPlace")}
      </span>
      {reasoning}
    </div>
  );
}
