"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import BiasScoreCard from "@/components/BiasScoreCard";
import ProbeResultTable from "@/components/ProbeResultTable";
import {
  getAuditResults,
  generateReport,
  getReportPdfUrl,
  type AuditResultsResponse,
  type ReportResponse,
} from "@/lib/api";

export default function ReportPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [results, setResults] = useState<AuditResultsResponse | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getAuditResults(auditId);
        setResults(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      }
    })();
  }, [auditId]);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const r = await generateReport(auditId);
      setReport(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    }
    setGenerating(false);
  };

  return (
    <>
      <Navbar />
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "96px 24px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-1px",
                marginBottom: 4,
              }}
            >
              Bias Audit Report
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Audit: {auditId.slice(0, 12)}...
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {report?.pdf_url ? (
              <a
                href={getReportPdfUrl(auditId)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                📥 Download PDF
              </a>
            ) : (
              <button
                className="btn-primary"
                onClick={handleGeneratePdf}
                disabled={generating || !results}
              >
                {generating ? "Generating..." : "📄 Generate PDF Report"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "14px 20px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md)",
              color: "var(--score-red)",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            {error}
          </div>
        )}

        {results && (
          <>
            {/* Summary cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 40,
              }}
            >
              {/* Overall Score */}
              <div
                className="glass-card glow-border"
                style={{ padding: 24, textAlign: "center" }}
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
                  Overall Score
                </div>
                <div
                  style={{ fontSize: 40, fontWeight: 900 }}
                  className={
                    results.overall_score < 0.25
                      ? "score-low"
                      : results.overall_score < 0.5
                      ? "score-moderate"
                      : results.overall_score < 0.75
                      ? "score-high"
                      : "score-severe"
                  }
                >
                  {results.overall_score.toFixed(2)}
                </div>
              </div>

              {/* Stats */}
              <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Total Probes
                </div>
                <div
                  className="gradient-text"
                  style={{ fontSize: 40, fontWeight: 900 }}
                >
                  {results.probe_results.length}
                </div>
              </div>

              <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Categories
                </div>
                <div
                  className="gradient-text"
                  style={{ fontSize: 40, fontWeight: 900 }}
                >
                  {new Set(results.bias_scores.map((s) => s.category)).size}
                </div>
              </div>

              <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Significant Findings
                </div>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 900,
                    color: "var(--score-orange)",
                  }}
                >
                  {results.bias_scores.filter((s) => s.p_value < 0.05).length}
                </div>
              </div>
            </div>

            {/* Template Versions */}
            {Object.keys(results.probe_template_versions).length > 0 && (
              <div
                className="glass-card"
                style={{ padding: 20, marginBottom: 32 }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  Probe Template Versions
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {Object.entries(results.probe_template_versions).map(
                    ([id, version]) => (
                      <span
                        key={id}
                        style={{
                          padding: "4px 10px",
                          background: "var(--bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {id}: v{version}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Bias Scores */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Detailed Scores
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
                marginBottom: 40,
              }}
            >
              {results.bias_scores.map((score, i) => (
                <BiasScoreCard
                  key={`${score.category}-${score.score_type}-${i}`}
                  score={score}
                />
              ))}
            </div>

            {/* Probe Results Table */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Probe Details
            </h2>
            <ProbeResultTable results={results.probe_results} />
          </>
        )}

        {!results && !error && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 40,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="shimmer"
                style={{
                  height: 120,
                  borderRadius: "var(--radius-lg)",
                }}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
