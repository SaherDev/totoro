import { cn } from "@totoro/ui";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { TotoroProcessing } from "@/components/illustrations/totoro-illustrations";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message, className }: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      className={cn("flex flex-col items-center justify-center py-12 px-4", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] anim-sway mb-4">
        <TotoroProcessing />
      </div>
      <p className="font-body text-sm text-muted-foreground animate-pulse">
        {message || t("loading.thinking")}
      </p>
    </motion.div>
  );
}
