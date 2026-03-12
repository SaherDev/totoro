import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const cardVariants = cva(
  "bg-card text-card-foreground transition-all duration-300",
  {
    variants: {
      elevation: {
        flat: "shadow-none border border-border rounded-2xl",
        sm: "shadow-totoro-sm border border-border/60 rounded-2xl",
        md: "shadow-totoro-md border-0 rounded-3xl",
        lg: "shadow-totoro-lg border-0 rounded-3xl",
        floating: "shadow-totoro-lg border-0 rounded-[1.75rem]",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-totoro-lg hover:-translate-y-1 active:translate-y-0 active:shadow-totoro-md",
        false: "",
      },
    },
    defaultVariants: {
      elevation: "md",
      interactive: false,
    },
  }
);

export interface TotoroCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const TotoroCard = React.forwardRef<HTMLDivElement, TotoroCardProps>(
  ({ className, elevation, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ elevation, interactive, className }))}
      {...props}
    />
  )
);
TotoroCard.displayName = "TotoroCard";

const TotoroCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 pt-6 pb-2", className)} {...props} />
));
TotoroCardHeader.displayName = "TotoroCardHeader";

const TotoroCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 pb-6", className)} {...props} />
));
TotoroCardContent.displayName = "TotoroCardContent";

export { TotoroCard, TotoroCardHeader, TotoroCardContent, cardVariants };
