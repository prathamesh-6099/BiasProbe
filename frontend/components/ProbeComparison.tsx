"use client";
/**
 * components/ProbeComparison.tsx
 * Side-by-side card showing two prompt/response pairs from the most biased pair.
 */
import { cn, scoreColor } from "@/lib/utils";
import type { JudgementPair } from "@/lib/api";
import { ArrowRight, AlertTriangle } from "lucide-react";

interface Props {
  pair: JudgementPair;
  rank?: number;
}

function ScoreDot({ label, value }: { label: string; value: number | string }) {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  const color = isNaN(num) ? "#9CA3AF" : scoreColor(num * 10);
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-gray-500 capitalize">{label}</span>
      <span className="font-mono font-semibold" style={{ color }}>
        {typeof value === "number" ? value.toFixed(2) : value}
      </span>
    </div>
  );
}

export default function ProbeComparison({ pair, rank }: Props) {
  const delta      = Math.abs(pair.composite_delta ?? 0);
  const deltaColor = delta > 0.4 ? "#F04438" : delta > 0.2 ? "#F79009" : "#F79009";

  return (
    <div className="card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-content-border bg-gray-50/60">
        <div className="flex items-center gap-2">
          {rank && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {rank}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-700 capitalize">
            {pair.attribute_tested?.replace(/_/g, " ")} bias
          </span>
          <span className="badge badge-neutral text-[10px]">
            {pair.group_a} vs {pair.group_b}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: deltaColor }} />
          <span className="text-xs font-semibold font-mono" style={{ color: deltaColor }}>
            Δ {delta.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Side-by-side responses */}
      <div className="grid grid-cols-2 divide-x divide-content-border">
        {/* Group A */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand inline-block" />
            <span className="text-xs font-semibold text-brand">
              {pair.group_a}
            </span>
          </div>

          {pair.prompt_a && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Prompt
              </p>
              <p className="text-xs text-gray-600 font-mono bg-gray-50 rounded p-2 line-clamp-3 border border-content-border">
                {pair.prompt_a}
              </p>
            </div>
          )}

          {pair.response_a && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Response
              </p>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-5">
                {pair.response_a}
              </p>
            </div>
          )}

          {/* Scores */}
          {pair.score_a && (
            <div className="pt-2 border-t border-content-border space-y-1">
              {Object.entries(pair.score_a).map(([k, v]) => (
                <ScoreDot key={k} label={k.replace(/_/g, " ")} value={v as number | string} />
              ))}
            </div>
          )}
        </div>

        {/* Group B */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-risk-non_compliant inline-block" />
            <span className="text-xs font-semibold text-risk-non_compliant">
              {pair.group_b}
            </span>
          </div>

          {pair.prompt_b && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Prompt
              </p>
              <p className="text-xs text-gray-600 font-mono bg-gray-50 rounded p-2 line-clamp-3 border border-content-border">
                {pair.prompt_b}
              </p>
            </div>
          )}

          {pair.response_b && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Response
              </p>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-5">
                {pair.response_b}
              </p>
            </div>
          )}

          {/* Scores */}
          {pair.score_b && (
            <div className="pt-2 border-t border-content-border space-y-1">
              {Object.entries(pair.score_b).map(([k, v]) => (
                <ScoreDot key={k} label={k.replace(/_/g, " ")} value={v as number | string} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Triggered thresholds footer */}
      {pair.triggered_thresholds?.length > 0 && (
        <div className="px-4 py-2 border-t border-content-border bg-red-50/40 flex flex-wrap gap-1.5">
          <span className="text-[10px] font-semibold text-gray-500 mr-1">Triggered:</span>
          {pair.triggered_thresholds.map(t => (
            <span key={t} className="badge badge-high text-[10px]">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
