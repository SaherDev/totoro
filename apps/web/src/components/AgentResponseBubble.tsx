import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { PlaceCard, PlaceListCard } from "@/components/PlaceCard";
import {
  TotoroAddPlace,
  TotoroAddPlaceProcessing,
  TotoroAddPlaceSuccess,
  TotoroResultCard,
  TotoroError,
  TotoroEmpty,
  TotoroStepListen,
  TotoroStepRead,
  TotoroStepMove,
  TotoroStepCheck,
  TotoroStepEvaluate,
  TotoroStepComplete,
} from "@/components/illustrations/totoro-illustrations";

const RECOMMEND_STEP_KEYS = [
  "agent.steps.listen",
  "agent.steps.read",
  "agent.steps.move",
  "agent.steps.check",
  "agent.steps.evaluate",
];

const RECOMMEND_STEP_ICONS = [
  TotoroStepListen,
  TotoroStepRead,
  TotoroStepMove,
  TotoroStepCheck,
  TotoroStepEvaluate,
];

const ADD_PLACE_STEP_KEYS = [
  "addPlace.steps.receive",
  "addPlace.steps.extract",
];

const ADD_PLACE_STEP_ICONS = [
  TotoroAddPlace,
  TotoroAddPlaceProcessing,
];

const RECALL_STEP_KEYS = ["recall.searching"];
const RECALL_STEP_ICONS = [TotoroStepRead];

export type AgentFlow = "recommend" | "add-place" | "recall";

// Extract flow-based step selection to reduce duplication
function getStepConfig(flow: AgentFlow) {
  switch (flow) {
    case "add-place":
      return { keys: ADD_PLACE_STEP_KEYS, icons: ADD_PLACE_STEP_ICONS };
    case "recall":
      return { keys: RECALL_STEP_KEYS, icons: RECALL_STEP_ICONS };
    default:
      return { keys: RECOMMEND_STEP_KEYS, icons: RECOMMEND_STEP_ICONS };
  }
}

const MOCK_RESULTS = {
  primary: {
    name: "Osteria Francescana",
    address: "Via Stella 22, Modena",
    reasoning: "It matches your love for Italian cuisine, is within your budget, and has stellar reviews.",
    source: "discovered" as const,
    cuisine: "Italian",
    priceRange: "$$",
  },
  alternatives: [
    {
      name: "Trattoria da Mario",
      address: "Piazza del Mercato 5",
      reasoning: "From your saved places. Reliable, affordable, and only 8 minutes away.",
      source: "saved" as const,
      cuisine: "Italian",
      priceRange: "$",
    },
    {
      name: "Noma Pop-Up",
      address: "Refshaleøen 96",
      reasoning: "A wild card — different style but matches your recent interest in fermented foods.",
      source: "discovered" as const,
      cuisine: "Nordic",
      priceRange: "$$$",
    },
  ],
};

const MOCK_RECALL_RESULTS = [
  {
    place_id: '1',
    place_name: 'Fuji Ramen',
    address: '123 Sukhumvit Soi 33, Bangkok',
    cuisine: 'ramen',
    price_range: 'low',
    source_url: 'https://www.tiktok.com/@foodie/video/123',
    match_reason: 'Saved from TikTok, tagged ramen',
  },
  {
    place_id: '2',
    place_name: 'Bankara Ramen',
    address: '456 Sukhumvit Soi 39, Bangkok',
    cuisine: 'ramen',
    price_range: '$$',
    source_url: null,
    match_reason: 'Ramen restaurant, saved 2 months ago',
  },
];

type Phase = "thinking" | "result" | "error";

interface AgentResponseBubbleProps {
  hasError?: boolean;
  flow?: AgentFlow;
  content?: string;
}

export function AgentResponseBubble({
  hasError = false,
  flow = "recommend",
  content,
}: AgentResponseBubbleProps) {
  const t = useTranslations();
  const [phase, setPhase] = useState<Phase>(content ? "result" : "thinking");
  const [activeStep, setActiveStep] = useState(0);

  // Memoize step configuration to avoid recalculation
  const { keys: stepKeys, icons: stepIcons } = useMemo(() => getStepConfig(flow), [flow]);

  useEffect(() => {
    if (phase !== "thinking") return;
    if (hasError) {
      if (activeStep < 2) {
        const timer = setTimeout(() => setActiveStep((s) => s + 1), 1400);
        return () => clearTimeout(timer);
      } else {
        const done = setTimeout(() => setPhase("error"), 500);
        return () => clearTimeout(done);
      }
    }
    if (activeStep < stepKeys.length) {
      const timer = setTimeout(() => setActiveStep((s) => s + 1), 1400);
      return () => clearTimeout(timer);
    } else {
      const done = setTimeout(() => setPhase("result"), 500);
      return () => clearTimeout(done);
    }
  }, [activeStep, phase, hasError, stepKeys.length]);

  useEffect(() => {
    if (content && phase === "thinking") {
      setPhase("result");
    }
  }, [content, phase]);

  // Memoize computed step values to avoid unnecessary recalculations
  const { currentStepKey, StepIcon } = useMemo(() => {
    const stepKey = stepKeys[Math.min(activeStep, stepKeys.length - 1)];
    const icon = activeStep >= stepKeys.length
      ? flow === "add-place"
        ? TotoroAddPlaceSuccess
        : TotoroStepComplete
      : stepIcons[activeStep] ?? TotoroStepListen;
    return { currentStepKey: stepKey, StepIcon: icon };
  }, [activeStep, stepKeys, stepIcons, flow]);

  return (
    <div className="flex gap-3 items-start">
      <AnimatePresence mode="wait">
        {phase === "thinking" ? (
          flow === "recall" ? (
            <motion.div
              key="thinking-recall"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-muted p-1.5">
                <TotoroStepRead />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="font-display text-sm text-foreground font-medium">
                  {t("recall.searching")}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {t("recall.takesAbout")}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-muted p-1.5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full"
                  >
                    <StepIcon />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-0.5">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={activeStep}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="font-display text-sm text-foreground font-medium"
                  >
                    {activeStep < stepKeys.length
                      ? t(currentStepKey)
                      : flow === "add-place"
                        ? t("addPlace.almostDone")
                        : t("agent.almostDone")}
                  </motion.p>
                </AnimatePresence>
                <p className="font-body text-xs text-muted-foreground">
                  {flow === "add-place" ? t("addPlace.takesAbout") : t("agent.takesAbout")}
                </p>
              </div>
            </motion.div>
          )
        ) : phase === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-muted p-1.5">
              <TotoroError />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-display text-sm text-foreground font-medium">
                {t("agent.somethingWrong")}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {t("agent.tryAgain")}
              </p>
            </div>
          </motion.div>
        ) : content ? (
          <motion.div
            key="echo-result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-muted p-1.5">
              <TotoroResultCard />
            </div>
            <div>
              <p className="font-display text-sm text-foreground">
                {content}
              </p>
            </div>
          </motion.div>
        ) : flow === "add-place" ? (
          <motion.div
            key="add-place-result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-muted p-1.5 anim-bounce">
              <TotoroAddPlaceSuccess />
            </div>
            <div>
              <p className="font-display text-lg text-foreground">
                {t("addPlace.savedTitle")}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {t("addPlace.savedSubtitle")}
              </p>
            </div>
          </motion.div>
        ) : flow === "recall" && MOCK_RECALL_RESULTS.length > 0 ? (
          <motion.div
            key="recall-result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-3 w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-muted p-1.5">
                <TotoroResultCard />
              </div>
              <div>
                <p className="font-display text-lg text-foreground">
                  {t("recall.foundTitle")}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {t("recall.foundSubtitle")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {MOCK_RECALL_RESULTS.map((place) => (
                <PlaceListCard
                  key={place.place_id}
                  name={place.place_name}
                  address={place.address}
                  reasoning={place.match_reason}
                  source="saved"
                  cuisine={place.cuisine ?? undefined}
                  priceRange={place.price_range ?? undefined}
                />
              ))}
            </div>
          </motion.div>
        ) : flow === "recall" && MOCK_RECALL_RESULTS.length === 0 ? (
          <motion.div
            key="recall-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-muted p-1.5">
              <TotoroEmpty />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-display text-sm text-foreground font-medium">
                {t("recall.noResults")}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {t("recall.noResultsDesc")}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4 w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-muted p-1.5 anim-sway-gentle">
                <TotoroResultCard />
              </div>
              <div>
                <p className="font-display text-lg text-foreground">
                  {t("result.heresPick")}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {t("result.basedOnTaste")}
                </p>
              </div>
            </div>

            <PlaceCard {...MOCK_RESULTS.primary} isPrimary />

            <div>
              <p className="font-body text-xs text-muted-foreground mb-2">
                {t("result.alsoWorth")}
              </p>
              <div className="flex flex-col gap-2">
                {MOCK_RESULTS.alternatives.map((alt, i) => (
                  <PlaceListCard key={i} {...alt} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
