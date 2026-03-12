import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 font-body text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        saved: "bg-forest-soft text-primary border border-primary/20",
        live: "bg-gold-soft text-accent-foreground border border-accent/20",
        discovered: "bg-secondary text-secondary-foreground border border-border",
      },
    },
    defaultVariants: {
      variant: "discovered",
    },
  }
);

interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

function Tag({ className, variant, ...props }: TagProps) {
  return (
    <span className={cn(tagVariants({ variant, className }))} {...props} />
  );
}

export { Tag, tagVariants };
