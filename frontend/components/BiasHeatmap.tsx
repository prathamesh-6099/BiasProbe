"use client";
/**
 * components/BiasHeatmap.tsx
 * Responsive table: rows = protected attributes, cols = score dimensions.
 * Cells are color-coded by severity. Clickable to show probe examples.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AttributeResult } from "@/lib/api";

interface Props {
  perAttribute: Record<string, AttributeResult>;
  onCellClick?: (attribute: string, dimension: string) => void;
}

const DIMENSIONS = [
  { key: "sentiment_score",          label: "Sentiment"       },
  { key: "recommendation_strength",  label: "Recommendation"  },
  { key: "outcome",                  label: "Outcome"         },
  { key: "fairness_score",           label: "Overall"         },
];

/** Map a 0-100 score to a heat-level 0-5 */
function heatLevel(score: number): number {
  if (score >= 90) return 0;
  if (score >= 75) return 1;
  if (score >= 60) return 2;
  if (score >= 45) return 3;
  if (score >= 30) return 4;
  return 5;
}

const HEAT_CLASSES = [
  "bg-green-50  text-green-800",
  "bg-green-100 text-green-800",
  "bg-yellow-50 text-yellow-800",
  "bg-amber-100 text-amber-800",
  "bg-orange-100 text-orange-800",
  "bg-red-100   text-red-800",
];

export default function BiasHeatmap({ perAttribute, onCellClick }: Props) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const attributes = Object.keys(perAttribute);
  if (!attributes.length) return null;

  function getDimensionScore(attr: AttributeResult, dimKey: string): number {
    if (dimKey === "fairness_score") return attr.fairness_score ?? 50;
    // Try to derive from significant findings mean_delta
    const finding = attr.significant_findings?.find(f =>
      f.dimension?.toLowerCase().includes(dimKey.replace(/_/g, " "))
    );
    if (finding) {
      // Larger delta = worse: invert from 1 mean_delta relative scale
      return Math.max(0, Math.min(100, 100 - Math.abs(finding.mean_delta ?? 0) * 50));
    }
    // Default: inherit fairness score
    return attr.fairness_score ?? 50;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-content-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-content-border">
            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-40">
              Attribute
            </th>
            {DIMENSIONS.map(d => (
              <th
                key={d.key}
                className="px-4 py-3 text-center font-semibold text-gray-600 min-w-28"
              >
                {d.label}
              </th>
            ))}
            <th className="px-4 py-3 text-center font-semibold text-gray-600 w-28">
              Severity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-content-border">
          {attributes.map((attr) => {
            const data = perAttribute[attr];
            return (
              <tr key={attr} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-700 capitalize">
                  {attr.replace(/_/g, " ")}
                </td>
                {DIMENSIONS.map(d => {
                  const score = getDimensionScore(data, d.key);
                  const level = heatLevel(score);
                  const cellId = `${attr}-${d.key}`;
                  return (
                    <td
                      key={d.key}
                      className={cn(
                        "px-4 py-3 text-center font-mono font-medium text-xs cursor-pointer",
                        "transition-all duration-150 rounded-sm",
                        HEAT_CLASSES[level],
                        hoveredCell === cellId && "ring-2 ring-brand ring-inset"
                      )}
                      title={`${attr} · ${d.label}: ${score.toFixed(0)}`}
                      onClick={() => onCellClick?.(attr, d.key)}
                      onMouseEnter={() => setHoveredCell(cellId)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {score.toFixed(0)}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "badge text-[10px]",
                    data.severity === "high"   && "badge-high",
                    data.severity === "medium" && "badge-medium",
                    data.severity === "low"    && "badge-low",
                    !data.severity             && "badge-neutral",
                  )}>
                    {(data.severity ?? "–").toUpperCase()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-content-border bg-gray-50">
        <span className="text-[10px] font-medium text-gray-400 mr-1">SCORE</span>
        {[
          { label: "90–100", cls: "bg-green-50 text-green-800" },
          { label: "75–90",  cls: "bg-green-100 text-green-800" },
          { label: "60–75",  cls: "bg-yellow-50 text-yellow-800" },
          { label: "45–60",  cls: "bg-amber-100 text-amber-800" },
          { label: "30–45",  cls: "bg-orange-100 text-orange-800" },
          { label: "0–30",   cls: "bg-red-100 text-red-800" },
        ].map(({ label, cls }) => (
          <span key={label} className={cn("badge text-[10px]", cls)}>
            {label}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-gray-400">Click a cell for probe examples</span>
      </div>
    </div>
  );
}
