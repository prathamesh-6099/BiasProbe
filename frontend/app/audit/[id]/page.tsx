"use client";
/**
 * app/audit/[id]/page.tsx — Live audit results page
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, FileText, AlertTriangle, CheckCircle2, ChevronRight, Shield, ArrowLeft, SearchX } from "lucide-react";
import { cn, riskBadgeClass, scoreColor } from "@/lib/utils";
import { api, AuditResults, AuditStatus, JudgementPair } from "@/lib/api";
import FairnessGauge from "@/components/FairnessGauge";
import BiasHeatmap from "@/components/BiasHeatmap";
import ProbeComparison from "@/components/ProbeComparison";

const STATUS_LABELS: Record<string, string> = {
  created: "Audit created — waiting to start…", battery_ready: "Battery ready — starting probes…",
  running: "Running probes…", probes_complete: "Probes complete — starting judgement…",
  judging: "Judging responses with Gemini…", judged: "Judgement complete — running analysis…",
  analysing: "Running statistical analysis…",
  analysed: "Analysis complete", complete: "Audit complete",
  failed: "Audit failed", judge_failed: "Judgement failed", stats_failed: "Analysis failed",
  generating_report: "Generating compliance report…", report_ready: "Report ready",
};
const TERMINAL = new Set(["analysed", "complete", "judged", "report_ready", "failed", "judge_failed", "stats_failed"]);

export default function AuditPage() {
  const { id: auditId } = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<AuditStatus | null>(null);
  const [results, setResults] = useState<AuditResults | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [worstPairs, setWorstPairs] = useState<JudgementPair[]>([]);
  const stoppedRef = useRef(false);
  const errorCountRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    if (stoppedRef.current) return;
    try {
      const s = await api.audit.status(auditId);
      errorCountRef.current = 0; // reset on success
      setStatus(s);
      if (TERMINAL.has(s.status)) {
        stoppedRef.current = true;
        try {
          const r = await api.audit.results(auditId);
          setResults(r);
          if (r.judgements?.length) {
            const sorted = [...r.judgements].sort((a, b) => Math.abs(b.composite_delta) - Math.abs(a.composite_delta));
            setWorstPairs(sorted.slice(0, 3));
          }
        } catch (resErr: any) {
          // Results may not be available for failed audits — that's ok
          if (!s.status.includes("failed")) {
            setError(resErr.message ?? "Failed to load results");
          }
        }
      }
    } catch (err: any) {
      const msg = err.message ?? "Failed to load audit";
      // Stop polling on 404 (audit doesn't exist)
      if (msg.includes("not found") || msg.includes("404")) {
        stoppedRef.current = true;
        setNotFound(true);
        setError(msg);
        return;
      }
      // Stop polling after 5 consecutive errors
      errorCountRef.current++;
      if (errorCountRef.current >= 5) {
        stoppedRef.current = true;
        setError(`${msg} (stopped after ${errorCountRef.current} failures)`);
        return;
      }
      setError(msg);
    }
  }, [auditId]);

  useEffect(() => {
    stoppedRef.current = false;
    errorCountRef.current = 0;
    fetchStatus();
    const iv = setInterval(() => {
      if (stoppedRef.current || (status && TERMINAL.has(status.status))) {
        clearInterval(iv);
        return;
      }
      fetchStatus();
    }, 3000);
    return () => clearInterval(iv);
  }, [fetchStatus]);

  async function generateReport() {
    setGenerating(true);
    try {
      await api.report.generate(auditId);
      const check = setInterval(async () => {
        const s = await api.audit.status(auditId);
        if (s.status === "report_ready") { clearInterval(check); router.push(`/reports/${auditId}`); }
        if (s.status === "report_failed") { clearInterval(check); setError("Report generation failed"); setGenerating(false); }
      }, 3000);
    } catch (err: any) { setError(err.message ?? "Report failed"); setGenerating(false); }
  }

  const isRunning = !notFound && (!status || !TERMINAL.has(status.status));
  const isFailed  = status?.status === "failed" || status?.status === "judge_failed" || status?.status === "stats_failed";
  const progress  = status?.percent_done ?? status?.progress ?? 0;

  // --- Not Found screen ---
  if (notFound) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center space-y-6 animate-fade-in">
        <SearchX className="h-16 w-16 text-gray-300 mx-auto" />
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Audit Not Found</h1>
        <p className="text-gray-500">
          The audit <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{auditId}</code> doesn&apos;t exist or has been deleted.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => router.push("/dashboard")} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <button onClick={() => router.push("/audit/new")} className="btn-primary">
            Start New Audit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">Audit Results</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{auditId}</p>
        </div>
        {results && <span className={cn("badge mt-1", riskBadgeClass(results.risk_level))}>{results.risk_level?.replace(/_/g, " ").toUpperCase()}</span>}
      </div>

      {error && !notFound && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {isRunning && !isFailed && (
        <div className="card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            <div>
              <p className="font-semibold text-[#1A1A2E] text-sm">{STATUS_LABELS[status?.status ?? ""] ?? "Processing…"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Polling every 3 seconds · this may take several minutes</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${Math.max(4, progress)}%` }} />
          </div>
          {progress > 0 && <p className="text-xs text-gray-400 text-right">{progress}%</p>}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {["Running", "Judging", "Analysing", "Complete"].map((label, i) => {
              // Map backend status → step index (0=Running, 1=Judging, 2=Analysing, 3=Complete)
              const statusMap: Record<string, number> = {
                battery_ready: -1, created: -1,
                running: 0, probes_complete: 0,
                judging: 1, judged: 1,
                analysing: 2, analysed: 3, complete: 3,
                report_ready: 3, generating_report: 3,
              };
              const si = statusMap[status?.status ?? ""] ?? -1;
              return (
                <div key={label} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("h-2 w-2 rounded-full flex-shrink-0", si > i ? "bg-risk-compliant" : si === i ? "bg-brand animate-pulse" : "bg-gray-200")} />
                  <span className={cn(si > i ? "text-risk-compliant" : si === i ? "text-brand font-medium" : "text-gray-300")}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isFailed && !results && (
        <div className="card p-8 text-center space-y-4 animate-fade-in">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-[#1A1A2E]">Audit Failed</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {STATUS_LABELS[status?.status ?? ""] ?? "Something went wrong during the audit pipeline."}
            {error && <><br /><span className="text-red-500">{error}</span></>}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => router.push("/dashboard")} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
            <button onClick={() => router.push("/audit/new")} className="btn-primary">
              Start New Audit
            </button>
          </div>
        </div>
      )}

      {results && !isRunning && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Attributes",  value: Object.keys(results.per_attribute ?? {}).length },
              { label: "Regulations", value: results.regulatory_flags?.length ?? 0 },
              { label: "Risk Level",  value: results.risk_level?.replace(/_/g, " ") ?? "—" },
              { label: "Score",       value: results.fairness_score != null && !isNaN(results.fairness_score) ? `${results.fairness_score.toFixed(0)} / 100` : "N/A" },
            ].map(m => (
              <div key={m.label} className="card px-4 py-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{m.label}</p>
                <p className="text-xl font-bold text-[#1A1A2E] mt-1 capitalize">{String(m.value)}</p>
              </div>
            ))}
          </div>

          <div className="card p-8 flex flex-col sm:flex-row items-center gap-10">
            <FairnessGauge score={results.fairness_score} size={200} />
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="section-title">Overall Fairness Assessment</h2>
                <p className="text-sm text-gray-500 mt-1">Based on {Object.keys(results.per_attribute ?? {}).length} protected attributes.</p>
              </div>
              <div className="space-y-2">
                {Object.entries(results.per_attribute ?? {}).map(([attr, data]) => (
                  <div key={attr} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 capitalize flex-shrink-0">{attr.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${data.fairness_score ?? 50}%`, backgroundColor: scoreColor(data.fairness_score ?? 50) }} />
                    </div>
                    <span className="text-xs font-mono font-semibold w-8 text-right" style={{ color: scoreColor(data.fairness_score ?? 50) }}>
                      {(data.fairness_score ?? 0).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {Object.keys(results.per_attribute ?? {}).length > 0 && (
            <div>
              <h2 className="section-title mb-3">Bias Heatmap</h2>
              <p className="section-sub mb-4">Scores per attribute × dimension. Lower = more bias detected.</p>
              <BiasHeatmap perAttribute={results.per_attribute} />
            </div>
          )}

          {worstPairs.length > 0 && (
            <div>
              <h2 className="section-title mb-1">Worst Offenders</h2>
              <p className="section-sub mb-4">The 3 probe pairs with the highest composite bias delta.</p>
              <div className="space-y-4">
                {worstPairs.map((pair, i) => <ProbeComparison key={pair.pair_id ?? i} pair={pair} rank={i + 1} />)}
              </div>
            </div>
          )}

          {results.regulatory_flags && results.regulatory_flags.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-brand" />
                <h2 className="section-title">Regulatory Exposure</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {results.regulatory_flags.map(flag => <span key={flag} className="badge badge-non_compliant text-xs">{flag}</span>)}
              </div>
              <p className="text-xs text-gray-400 mt-3">Consult your legal team before making compliance claims.</p>
            </div>
          )}

          {status?.status !== "report_ready" && status?.status !== "generating_report" && (
            <div className="rounded-xl bg-gradient-to-r from-brand/5 to-brand/10 border border-brand/20 p-6 flex items-center justify-between gap-6">
              <div>
                <h3 className="font-semibold text-[#1A1A2E]">Generate Full Compliance Report</h3>
                <p className="text-sm text-gray-500 mt-0.5">Gemini will write a plain-English PDF report with findings and remediation steps.</p>
              </div>
              <button onClick={generateReport} disabled={generating} className="btn-primary flex-shrink-0">
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</> : <><FileText className="h-4 w-4" />Generate Report</>}
              </button>
            </div>
          )}

          {status?.status === "report_ready" && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-6 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-risk-compliant flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Report ready</p>
                  <p className="text-sm text-green-600">Your compliance PDF report has been generated.</p>
                </div>
              </div>
              <button onClick={() => router.push(`/reports/${auditId}`)} className="btn-primary flex-shrink-0">
                View Report <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
