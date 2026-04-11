'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReasoningStep } from '@totoro/shared';
import {
  FLOW_2_STEPS,
  STEP_OFFSETS,
  STEP_DURATIONS,
  ANIMATION_COMPLETE_MS,
  SKELETON_APPEARS_MS,
} from './consult.constants';

interface ConsultThinkingProps {
  query: string;
  contextPills: string[];
  reasoningSteps: ReasoningStep[];
  onAnimationComplete: () => void;
}

interface StepState {
  visible: boolean;
  complete: boolean;
}

export function ConsultThinking({
  query,
  contextPills,
  reasoningSteps,
  onAnimationComplete,
}: ConsultThinkingProps) {
  const t = useTranslations();
  const [stepStates, setStepStates] = useState<StepState[]>(
    FLOW_2_STEPS.map(() => ({ visible: false, complete: false }))
  );
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timersRef.current;

    STEP_OFFSETS.forEach((offset, i) => {
      const showTimer = setTimeout(() => {
        setStepStates((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], visible: true };
          return next;
        });
      }, offset);

      const completeTimer = setTimeout(() => {
        setStepStates((prev) => {
          const next = [...prev];
          next[i] = { visible: true, complete: true };
          return next;
        });
      }, offset + STEP_DURATIONS[i]);

      timers.push(showTimer, completeTimer);
    });

    const skeletonTimer = setTimeout(() => setSkeletonVisible(true), SKELETON_APPEARS_MS);
    timers.push(skeletonTimer);

    const doneTimer = setTimeout(onAnimationComplete, ANIMATION_COMPLETE_MS);
    timers.push(doneTimer);

    return () => timers.forEach(clearTimeout);
  }, []); // intentional: run once on mount; onAnimationComplete is stable from store

  const pills =
    contextPills.length > 0
      ? contextPills
      : reasoningSteps[0]?.summary
        ? reasoningSteps[0].summary.split('·').map((s) => s.trim()).filter(Boolean)
        : [];

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('consult.header.thinkingAbout')}
        </span>
        <span className="text-sm font-medium text-foreground">{query}</span>
        {pills.map((pill) => (
          <span
            key={pill}
            className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-xs font-medium text-accent-gold"
          >
            {pill}
          </span>
        ))}
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3">
        {FLOW_2_STEPS.map((step, i) => {
          const state = stepStates[i];
          const subLabel = reasoningSteps.find((rs) => rs.step === step.key)?.summary ?? '';

          return (
            <div
              key={step.key}
              data-visible={state.visible}
              className="flex items-start gap-3 transition-all duration-200 data-[visible=false]:translate-y-2 data-[visible=false]:opacity-0 data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100"
            >
              {/* Step dot */}
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {state.complete ? (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border border-accent-gold">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                      <path
                        d="M1.5 4l2 2 3-3"
                        className="stroke-accent-gold"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : state.visible ? (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full border border-accent-gold">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-gold" />
                  </div>
                ) : (
                  <div className="h-4 w-4 rounded-full border border-border" />
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {t(step.i18nKey as Parameters<typeof t>[0])}
                </span>
                {subLabel && (
                  <span className="text-xs text-muted-foreground transition-opacity duration-150">
                    {subLabel}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Skeleton card */}
      {skeletonVisible && (
        <div className="mt-2 h-[110px] w-full animate-pulse rounded-xl bg-muted">
          <div className="flex flex-col gap-2 p-4">
            <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
            <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
            <div className="h-3 w-2/3 rounded bg-muted-foreground/20" />
          </div>
        </div>
      )}
    </div>
  );
}
