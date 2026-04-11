'use client';

import { useTranslations } from 'next-intl';
import { ILLUSTRATION_REGISTRY, type IllustrationId } from './registry';

interface IllustrationProps {
  id: IllustrationId;
  className?: string;
  animate?: boolean;
}

export function Illustration({ id, className = '', animate = true }: IllustrationProps) {
  const t = useTranslations();
  const def = ILLUSTRATION_REGISTRY[id];

  if (!def) {
    console.warn(`Unknown illustration ID: ${id}`);
    return null;
  }

  // Detect prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const shouldAnimate = animate && !prefersReducedMotion;
  const animationClass = shouldAnimate && def.animationClass ? def.animationClass : '';

  return (
    <img
      src={def.src}
      alt={t(def.altKey)}
      className={`motion-reduce:!animate-none ${animationClass} ${className}`}
    />
  );
}
