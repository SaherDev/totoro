import { cn } from "@totoro/ui";
import { motion } from "framer-motion";
import { Button } from "@totoro/ui";

interface EmptyStateProps {
  illustration: React.ReactNode;
  animationClass?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  illustration,
  animationClass = "anim-float",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={cn("w-[200px] h-[200px] md:w-[260px] md:h-[260px] lg:w-[320px] lg:h-[320px] mb-6", animationClass)}>
        {illustration}
      </div>
      <h2 className="font-display text-2xl text-foreground mb-2 md:text-3xl">{title}</h2>
      <p className="font-body text-sm text-muted-foreground max-w-xs leading-relaxed md:text-base mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="hero" size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
