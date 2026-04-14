"use client";

import { useState } from "react";
import type { ProbeResult } from "@/lib/api";

export default function ProbeResultTable({
  results,
}: {
  results: ProbeResult[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const categories = ["all", ...new Set(results.map((r) => r.category))];
  const filtered =
    filter === "all" ? results : results.filter((r) => r.category === filter);

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              border:
                filter === cat
                  ? "1px solid var(--accent-primary)"
                  : "1px solid var(--border-color)",
              background:
                filter === cat ? "var(--accent-glow)" : "var(--bg-secondary)",
              color:
                filter === cat
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.2s",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.slice(0, 50).map((r, idx) => {
          const key = `${r.probe_id}-${r.variant_group}-${idx}`;
          const isExpanded = expandedId === key;

          return (
            <div
              key={key}
              className="glass-card"
              style={{
                padding: "16px 20px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => setExpandedId(isExpanded ? null : key)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      className="badge badge-created"
                      style={{ fontSize: 10 }}
                    >
                      {r.category}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {r.variant_group}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      {r.probe_id}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: isExpanded ? "normal" : "nowrap",
                      maxWidth: isExpanded ? "none" : 600,
                    }}
                  >
                    {r.prompt}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    marginLeft: 16,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      Length
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {r.metrics.response_length}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      Sentiment
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {r.metrics.sentiment.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      Refusal
                    </div>
                    <div style={{ fontSize: 14 }}>
                      {r.metrics.refusal_detected ? "🚫" : "✓"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      color: "var(--text-muted)",
                      transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                    }}
                  >
                    ▾
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "16px",
                    background: "var(--bg-secondary)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Response
                  </div>
                  {r.response}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length > 50 && (
        <div
          style={{
            textAlign: "center",
            padding: 20,
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          Showing 50 of {filtered.length} results
        </div>
      )}
    </div>
  );
}
