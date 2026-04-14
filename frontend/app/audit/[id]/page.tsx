"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AuditStatusBadge from "@/components/AuditStatusBadge";
import BiasScoreCard from "@/components/BiasScoreCard";
import ProbeResultTable from "@/components/ProbeResultTable";
import {
  getAuditStatus,
  getAuditResults,
  type AuditStatusResponse,
  type AuditResultsResponse,
} from "@/lib/api";

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [status, setStatus] = useState<AuditStatusResponse | null>(null);
  const [results, setResults] = useState<AuditResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track latest status to avoid stale-closure in setInterval
  const statusRef = useRef(status);
  statusRef.current = status;

  const pollStatus = useCallback(async () => {
    try {
      const s = await getAuditStatus(auditId);
      setStatus(s);

      if (s.status === "completed") {
        const r = await getAuditResults(auditId);
        setResults(r);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    }
  }, [auditId]);

  useEffect(() => {
    pollStatus();

    const interval = setInterval(() => {
      // Read from ref (not stale closure) to get latest status
      const currentStatus = statusRef.current?.status;
      if (currentStatus === "completed" || currentStatus === "failed") {
        clearInterval(interval);
        return;
      }
      pollStatus();
    }, 3000);

    return () => clearInterval(interval);
    // Only depend on pollStatus — statusRef handles the rest
  }, [pollStatus]);

  // Safe progress calculation with null checks
  const progressTotal = status?.progress?.total ?? 0;
  const progressCompleted = status?.progress?.completed ?? 0;
  const progress = progressTotal > 0 ? (progressCompleted / progressTotal) * 100 : 0;

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px" }}>
                Audit
              </h1>
              <span
                style={{
                  fontSize: 14,
                  fontFamily: "monospace",
                  color: "var(--text-muted)",
                  background: "var(--bg-tertiary)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {auditId.slice(0, 12)}...
              </span>
              {status && <AuditStatusBadge status={status.status} />}
            </div>
          </div>

          {results && (
            <button
              className="btn-primary"
              onClick={() => router.push(`/reports/${auditId}`)}
            >
              📄 View Report
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="glass-card"
            style={{
              padding: 20,
              marginBottom: 24,
              borderColor: "rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.05)",
            }}
          >
            <span style={{ color: "var(--score-red)" }}>{error}</span>
          </div>
        )}

        {/* Progress section (while running) */}
        {status &&
          (status.status === "running" || status.status === "queued") && (
            <div
              className="glass-card animate-pulse-glow"
              style={{ padding: 32, marginBottom: 32 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  {status.status === "queued"
                    ? "⏳ Audit queued — starting soon..."
                    : "🔬 Running bias probes..."}
                </span>
                <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                  {progressCompleted} / {progressTotal} probes
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 12,
                }}
              >
                Probing your AI with demographic variants and measuring response
                differences. This may take a few minutes.
              </p>
            </div>
          )}

        {/* Results section */}
        {results && (
          <>
            {/* Overall Score */}
            <div
              className="glass-card glow-border"
              style={{
                padding: 40,
                marginBottom: 32,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: 12,
                }}
              >
                Overall Bias Score
              </div>
              <div
                style={{ fontSize: 72, fontWeight: 900, lineHeight: 1 }}
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
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  marginTop: 8,
                }}
              >
                {results.overall_score < 0.25
                  ? "✅ Low bias detected — your AI appears to treat demographics fairly."
                  : results.overall_score < 0.5
                    ? "⚠️ Moderate bias — some response differences detected across demographics."
                    : results.overall_score < 0.75
                      ? "🟠 High bias — significant response differences found. Review recommended."
                      : "🔴 Severe bias — critical demographic disparities detected. Action required."}
              </div>
            </div>

            {/* Bias Score Cards */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Bias Scores by Category
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
                <BiasScoreCard key={`${score.category}-${score.score_type}-${i}`} score={score} />
              ))}
            </div>

            {/* Probe Results */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Probe Results
            </h2>
            <ProbeResultTable results={results.probe_results} />
          </>
        )}

        {/* Failed state */}
        {status?.status === "failed" && (
          <div
            className="glass-card"
            style={{
              padding: 60,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Audit Failed
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 15,
                maxWidth: 400,
                margin: "0 auto",
              }}
            >
              Something went wrong while running the probes. Check that your
              target endpoint is accessible and returning valid JSON responses.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
