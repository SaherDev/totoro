'use client';

/**
 * All Totoro SVG illustrations as React components.
 * SVGs are served from public/illustrations/
 */

function SvgImg({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} width="100%" height="100%" />;
}

export function TotoroSplash() {
  return <SvgImg src="/illustrations/totoro-splash.svg" alt="Totoro splash" />;
}

export function TotoroAuth() {
  return <SvgImg src="/illustrations/totoro-auth.svg" alt="Totoro auth" />;
}

export function TotoroHomeInput() {
  return <SvgImg src="/illustrations/totoro-home-input.svg" alt="Totoro home input" />;
}

export function TotoroResultCard() {
  return <SvgImg src="/illustrations/totoro-result-card.svg" alt="Totoro result card" />;
}

export function TotoroAddPlace() {
  return <SvgImg src="/illustrations/totoro-add-place.svg" alt="Totoro add place" />;
}

export function TotoroAddPlaceProcessing() {
  return <SvgImg src="/illustrations/totoro-add-place-processing.svg" alt="Totoro add place processing" />;
}

export function TotoroAddPlaceSuccess() {
  return <SvgImg src="/illustrations/totoro-add-place-success.svg" alt="Totoro add place success" />;
}

export function TotoroSavedPlaces() {
  return <SvgImg src="/illustrations/totoro-saved-places.svg" alt="Totoro saved places" />;
}

export function TotoroPlaceDetail() {
  return <SvgImg src="/illustrations/totoro-place-detail.svg" alt="Totoro place detail" />;
}

export function TotoroStepListen() {
  return <SvgImg src="/illustrations/totoro-step-listen.svg" alt="Step: Listen" />;
}

export function TotoroStepRead() {
  return <SvgImg src="/illustrations/totoro-step-read.svg" alt="Step: Read" />;
}

export function TotoroStepMove() {
  return <SvgImg src="/illustrations/totoro-step-move.svg" alt="Step: Move" />;
}

export function TotoroStepCheck() {
  return <SvgImg src="/illustrations/totoro-step-check.svg" alt="Step: Check" />;
}

export function TotoroStepEvaluate() {
  return <SvgImg src="/illustrations/totoro-step-evaluate.svg" alt="Step: Evaluate" />;
}

export function TotoroStepComplete() {
  return <SvgImg src="/illustrations/totoro-step-complete.svg" alt="Step: Complete" />;
}

export function TotoroProcessing() {
  return <SvgImg src="/illustrations/totoro-processing.svg" alt="Processing" />;
}

export function TotoroSuccess() {
  return <SvgImg src="/illustrations/totoro-success.svg" alt="Success" />;
}

export function TotoroError() {
  return <SvgImg src="/illustrations/totoro-error.svg" alt="Error" />;
}

export function TotoroHoverPeek() {
  return <SvgImg src="/illustrations/totoro-hover-peek.svg" alt="Hover peek" />;
}
