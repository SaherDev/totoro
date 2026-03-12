import { cn } from "@totoro/ui";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  TotoroStepListen,
  TotoroStepRead,
  TotoroStepMove,
  TotoroStepCheck,
  TotoroStepEvaluate,
} from "@/components/illustrations/totoro-illustrations";

export type StepStatus = "waiting" | "active" | "done";

interface AgentStepProps {
  stepIndex: number;
  label: string;
  status: StepStatus;
  className?: string;
}

const stepIllustrations = [
  TotoroStepListen,
  TotoroStepRead,
  TotoroStepMove,
  TotoroStepCheck,
  TotoroStepEvaluate,
];

export function AgentStep({ stepIndex, label, status, className }: AgentStepProps) {
  const Illustration = stepIllustrations[stepIndex] ?? TotoroStepListen;

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 py-1.5 transition-all duration-300",
        status === "waiting" && "opacity-30",
        status === "done" && "opacity-50",
        className
      )}
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: status === "waiting" ? 0.3 : status === "done" ? 0.5 : 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Small icon */}
      <div className={cn(
        "w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center",
        status === "active" && "bg-accent/10",
        status === "done" && "bg-accent/10",
      )}>
        {status === "done" ? (
          <Check className="w-3.5 h-3.5 text-accent" />
        ) : (
          <div className={cn("w-5 h-5", status === "active" && "anim-bob")}>
            <Illustration />
          </div>
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "font-body text-sm",
          status === "active" ? "text-foreground font-medium" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </motion.div>
  );
}
