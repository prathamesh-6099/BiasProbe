"use client";
/**
 * components/FairnessGauge.tsx
 * Animated SVG arc gauge 0–100, color-transitions red→amber→green.
 */
import { useEffect, useRef } from "react";
import { scoreColor } from "@/lib/utils";

interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  animated?: boolean;
}

export default function FairnessGauge({
  score,
  size = 180,
  strokeWidth = 14,
  label = "Fairness Score",
  animated = true,
}: Props) {
  const progressRef = useRef<SVGCircleElement>(null);

  const radius      = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;  // half circle = π*r
  const center      = size / 2;
  const clampedScore = Math.max(0, Math.min(100, score));
  const fillOffset  = circumference - (clampedScore / 100) * circumference;
  const color       = scoreColor(clampedScore);

  useEffect(() => {
    if (!animated || !progressRef.current) return;
    const el = progressRef.current;
    // Start from empty
    el.style.strokeDashoffset = String(circumference);
    el.style.transition = "none";
    // Force reflow then animate
    void el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1.3s cubic-bezier(0.4, 0, 0.2, 1)";
    el.style.strokeDashoffset = String(fillOffset);
  }, [score, fillOffset, circumference, animated]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        aria-label={`${label}: ${clampedScore} out of 100`}
      >
        {/* Track (grey) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E8E8EC"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-180 ${center} ${center})`}
          style={{ clipPath: `inset(0 0 50% 0)` }}
        />

        {/* Progress arc */}
        <circle
          ref={progressRef}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={animated ? circumference : fillOffset}
          strokeLinecap="round"
          transform={`rotate(-180 ${center} ${center})`}
          style={{
            clipPath: `inset(0 0 50% 0)`,
            filter: `drop-shadow(0 0 6px ${color}60)`,
          }}
        />

        {/* Score text */}
        <text
          x={center}
          y={center - strokeWidth / 2 + 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="700"
          fontSize={size * 0.22}
          fill={color}
        >
          {clampedScore.toFixed(0)}
        </text>

        {/* /100 */}
        <text
          x={center}
          y={center - strokeWidth / 2 + 4 + size * 0.14}
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="400"
          fontSize={size * 0.085}
          fill="#9CA3AF"
        >
          / 100
        </text>
      </svg>

      {/* Label */}
      <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
        {label}
      </span>

      {/* Colour legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 mt-1">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-risk-non_compliant inline-block" />
          0–40
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-risk-at_risk inline-block" />
          40–80
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-risk-compliant inline-block" />
          80–100
        </span>
      </div>
    </div>
  );
}
