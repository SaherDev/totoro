import { useState } from "react";
import { cn, Badge, Button, TotoroCard, TotoroCardContent } from "@totoro/ui";
import { useTranslation } from "react-i18next";
import { ReasoningBlock } from "@/components/ReasoningBlock";
import { MapPin, Navigation, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlaceCardProps {
  name: string;
  address: string;
  reasoning: string;
  source: "saved" | "discovered";
  cuisine?: string;
  priceRange?: string;
  isPrimary?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function PlaceCard({
  name,
  address,
  reasoning,
  source,
  cuisine,
  priceRange,
  isPrimary = false,
  onSelect,
  className,
}: PlaceCardProps) {
  const { t } = useTranslation();

  return (
    <TotoroCard
      elevation={isPrimary ? "floating" : "md"}
      className={cn(isPrimary && "ring-2 ring-accent/30", className)}
    >
      <TotoroCardContent className="pt-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg text-foreground truncate md:text-xl">
              {name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-body text-xs truncate">{address}</span>
            </div>
          </div>
          {isPrimary && (
            <span className="px-2.5 py-1 rounded-full bg-accent/15 text-accent font-body text-xs font-medium flex-shrink-0">
              {t("place.topPick")}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {cuisine && <Badge variant="accent">{cuisine}</Badge>}
          {priceRange && <Badge variant="muted">{priceRange}</Badge>}
          <Badge variant={source === "saved" ? "primary" : "outline"}>
            {source === "saved" ? t("place.fromSaves") : t("place.discovered")}
          </Badge>
        </div>

        <ReasoningBlock reasoning={reasoning} />

        {onSelect && (
          <Button variant="hero" size="sm" className="w-full mt-1" onClick={onSelect}>
            <Navigation className="w-4 h-4 me-2" />
            {t("place.letsGo")}
          </Button>
        )}
      </TotoroCardContent>
    </TotoroCard>
  );
}

export function AlternativeCard({
  name,
  address,
  reasoning,
  source,
  cuisine,
  priceRange,
  onSelect,
  className,
}: Omit<PlaceCardProps, "isPrimary">) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <TotoroCard
      elevation="sm"
      className={cn("cursor-pointer transition-shadow", open && "shadow-md", className)}
      onClick={() => setOpen(!open)}
    >
      <TotoroCardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-display text-sm text-foreground truncate">{name}</h4>
            <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="font-body text-xs truncate">{address}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {cuisine && <Badge variant="accent" className="text-[10px] px-1.5 py-0.5">{cuisine}</Badge>}
            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-3 flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {priceRange && <Badge variant="muted">{priceRange}</Badge>}
                  <Badge variant={source === "saved" ? "primary" : "outline"}>
                    {source === "saved" ? t("place.fromSaves") : t("place.discovered")}
                  </Badge>
                </div>
                <ReasoningBlock reasoning={reasoning} />
                {onSelect && (
                  <Button variant="hero" size="sm" className="w-full mt-1" onClick={onSelect}>
                    <Navigation className="w-4 h-4 me-2" />
                    {t("place.letsGo")}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </TotoroCardContent>
    </TotoroCard>
  );
}
