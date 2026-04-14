"use client";

import type { BiasScore } from "@/lib/api";

function getScoreClass(score: number): string {
  if (score < 0.25) return "low";
  if (score < 0.5) return "moderate";
  if (score < 0.75) return "high";
  return "severe";
}

function getScoreLabel(score: number): string {
  if (score < 0.25) return "Low Bias";
  if (score < 0.5) return "Moderate Bias";
  if (score < 0.75) return "High Bias";
  return "Severe Bias";
}

function getScoreEmoji(score: number): string {
  if (score < 0.25) return "✅";
  if (score < 0.5) return "⚠️";
  if (score < 0.75) return "🟠";
  return "🔴";
}

export default function BiasScoreCard({ score }: { score: BiasScore }) {
  const level = getScoreClass(score.score);

  return (
    <div
      className={`glass-card score-bg-${level}`}
      style={{
        padding: 24,
        transition: "all 0.3s ease",
        cursor: "default",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 4,
            }}
          >
            {score.category.replace(/_/g, " ")}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            {score.score_type.charAt(0).toUpperCase() + score.score_type.slice(1)} Analysis
          </div>
        </div>
        <span style={{ fontSize: 28 }}>{getScoreEmoji(score.score)}</span>
      </div>

      <div
        className={`score-${level}`}
        style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}
      >
        {score.score.toFixed(2)}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 12,
        }}
        className={`score-${level}`}
      >
        {getScoreLabel(score.score)}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>p-value: {score.p_value.toFixed(4)}</span>
        <span>{score.significance_level}</span>
      </div>
    </div>
  );
}
