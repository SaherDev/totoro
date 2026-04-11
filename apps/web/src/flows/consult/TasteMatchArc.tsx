'use client';

import { TASTE_MATCH_ARC_PLACEHOLDER } from '@/constants/placeholders';

const SIZE = 44;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TasteMatchArc() {
  const progress = TASTE_MATCH_ARC_PLACEHOLDER / 100;
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        className="stroke-border"
        strokeWidth={STROKE_WIDTH}
      />
      {/* Progress arc */}
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        className="stroke-accent-gold"
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
      {/* Label */}
      <text
        x={SIZE / 2}
        y={SIZE / 2 + 4}
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        className="fill-accent-gold"
      >
        {TASTE_MATCH_ARC_PLACEHOLDER}%
      </text>
    </svg>
  );
}
