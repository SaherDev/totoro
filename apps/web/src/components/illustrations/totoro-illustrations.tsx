'use client';

/**
 * All Totoro SVG illustrations as React components.
 * SVGs are served from public/illustrations/
 * Animations applied via CSS classes from libs/ui/styles/tokens.css
 */

import { cn } from '@totoro/ui';

function SvgImg({ src, alt, animations }: { src: string; alt: string; animations?: string }) {
  return <img src={src} alt={alt} width="100%" height="100%" className={cn(animations)} />;
}

export function TotoroSplash() {
  return <SvgImg src="/illustrations/totoro-splash.svg" alt="Totoro splash" animations="anim-breathe" />;
}

export function TotoroAuth() {
  return <SvgImg src="/illustrations/totoro-auth.svg" alt="Totoro auth" animations="anim-breathe" />;
}

export function TotoroHomeInput() {
  return <SvgImg src="/illustrations/totoro-home-input.svg" alt="Totoro home input" animations="anim-bob" />;
}

/** Alias — idle/welcoming state on the home page */
export function TotoroIdleWelcoming() {
  return <SvgImg src="/illustrations/totoro-home-input.svg" alt="Totoro welcoming" animations="anim-bob" />;
}

export function TotoroResultCard() {
  return <SvgImg src="/illustrations/totoro-result-card.svg" alt="Totoro result card" animations="anim-sway-gentle" />;
}

export function TotoroAddPlace() {
  return <SvgImg src="/illustrations/totoro-add-place.svg" alt="Totoro add place" animations="anim-breathe" />;
}

export function TotoroAddPlaceProcessing() {
  return <SvgImg src="/illustrations/totoro-add-place-processing.svg" alt="Totoro add place processing" animations="anim-bob" />;
}

export function TotoroAddPlaceSuccess() {
  return <SvgImg src="/illustrations/totoro-add-place-success.svg" alt="Totoro add place success" animations="anim-bounce" />;
}

export function TotoroEmpty() {
  return <SvgImg src="/illustrations/totoro-empty.svg" alt="Totoro empty state" animations="anim-bob" />;
}

export function TotoroPlaceDetail() {
  return <SvgImg src="/illustrations/totoro-place-detail.svg" alt="Totoro place detail" animations="anim-float" />;
}


export function TotoroProcessing() {
  return <SvgImg src="/illustrations/totoro-processing.svg" alt="Processing" animations="anim-sway" />;
}

export function TotoroSuccess() {
  return <SvgImg src="/illustrations/totoro-success.svg" alt="Success" animations="anim-bounce" />;
}

/** Alias — taste profile celebration / excited state */
export function TotoroExcited() {
  return <SvgImg src="/illustrations/totoro-success.svg" alt="Totoro excited" animations="anim-bounce" />;
}

export function TotoroError() {
  return <SvgImg src="/illustrations/totoro-error.svg" alt="Error" animations="anim-sway-gentle" />;
}

export function TotoroHoverPeek() {
  return <SvgImg src="/illustrations/totoro-hover-peek.svg" alt="Hover peek" animations="anim-peek" />;
}
