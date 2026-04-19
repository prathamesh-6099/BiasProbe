"use client";
/**
 * app/reports/[id]/page.tsx — Full audit report viewer + PDF download
 */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2, CheckCircle2, XCircle, AlertTriangle, Shield, FileText } from "lucide-react";
import { cn, riskBadgeClass, severityBadgeClass, formatDateTime } from "@/lib/utils";
import { api, ReportData } from "@/lib/api";
import FairnessGauge from "@/components/FairnessGauge";

export default function ReportPage() {
  const { id: auditId } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.report.latest(auditId);
        setReport(data);
      } catch (err: any) {
        setError(err.message ?? "Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [auditId]);

  async function downloadPDF() {
    if (!report) return;
    setPdfLoading(true);
    try {
      const res = await api.report.pdf(auditId, report.report_id);
      window.open(res.signed_url, "_blank");
    } catch (err: any) {
      setError(err.message ?? "PDF failed");
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand" />
    </div>
  );

  if (error || !report) return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
      <AlertTriangle className="h-10 w-10 text-risk-at_risk mx-auto" />
      <p className="text-lg font-semibold text-[#1A1A2E]">Report not available</p>
      <p className="text-sm text-gray-500">{error || "No report found for this audit."}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-brand" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Compliance Report</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">
            {report.methodology?.split(".")[0] ?? "Audit Report"}
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-1">
            {formatDateTime(report.tested_at)} · Report {report.report_id.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn("badge", riskBadgeClass(report.risk_level))}>
            {report.risk_level?.replace(/_/g, " ").toUpperCase()}
          </span>
          <button onClick={downloadPDF} disabled={pdfLoading || !report.gcs_pdf_uri} className="btn-primary">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
        </div>
      </div>

      <div className="card p-6 flex flex-col sm:flex-row gap-8 items-start">
        <FairnessGauge score={report.fairness_score} size={160} />
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="section-title">Executive Summary</h2>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">{report.executive_summary}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 border border-content-border px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Fairness Score</p>
              <p className="text-xl font-bold text-[#1A1A2E] mt-1">{report.fairness_score.toFixed(1)} / 100</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-content-border px-4 py-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Certification</p>
              <div className="flex items-center gap-2 mt-1">
                {report.certification_eligible ? (
                  <><CheckCircle2 className="h-5 w-5 text-risk-compliant" /><span className="font-semibold text-risk-compliant">Eligible</span></>
                ) : (
                  <><XCircle className="h-5 w-5 text-risk-non_compliant" /><span className="font-semibold text-risk-non_compliant">Not eligible</span></>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {report.key_findings?.length > 0 && (
        <div>
          <h2 className="section-title mb-4">Key Findings</h2>
          <div className="space-y-4">
            {report.key_findings.map((f, i) => (
              <div key={i} className="card p-5 space-y-3 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-[#1A1A2E] capitalize">{f.attribute?.replace(/_/g, " ")} Bias</span>
                  <span className={cn("badge flex-shrink-0", severityBadgeClass(f.severity))}>{f.severity?.toUpperCase()}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{f.finding}</p>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">Evidence</p>
                  <p className="text-xs text-amber-800 italic leading-relaxed">{f.evidence}</p>
                </div>
                <div className="text-xs text-gray-500 font-mono bg-gray-50 rounded px-3 py-2 border border-content-border">
                  📊 {f.statistical_basis}
                </div>
                {f.regulatory_flags?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Shield className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                    {f.regulatory_flags.map(flag => <span key={flag} className="badge badge-non_compliant text-[10px]">{flag}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {report.remediation_steps?.length > 0 && (
        <div>
          <h2 className="section-title mb-4">Remediation Checklist</h2>
          <div className="card overflow-hidden">
            {report.remediation_steps.sort((a, b) => a.priority - b.priority).map((step, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4 border-b last:border-b-0 border-content-border hover:bg-gray-50/50 transition-colors">
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                  step.priority === 1 ? "bg-red-100 text-red-700" : step.priority === 2 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600")}>
                  {step.priority}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium text-[#1A1A2E]">{step.action}</p>
                  <p className="text-xs text-gray-500">{step.expected_impact}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-neutral text-[10px]">{step.technical_approach}</span>
                    <span className={cn("badge text-[10px]",
                      step.effort === "low" ? "badge-low" : step.effort === "medium" ? "badge-medium" : "badge-high")}>
                      {step.effort?.toUpperCase()} EFFORT
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.methodology && (
        <div className="card p-5">
          <h2 className="section-title mb-3">Methodology</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{report.methodology}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-content-border text-xs text-gray-400">
        <span>Generated by BiasProbe · {formatDateTime(report.tested_at)}</span>
        <span>Report ID: {report.report_id}</span>
      </div>
    </div>
  );
}
