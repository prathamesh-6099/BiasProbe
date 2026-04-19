"use client";
/**
 * app/dashboard/page.tsx (real implementation — moved out of route group)
 * Dashboard: summary metrics row + audit history table.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, FlaskConical, TrendingUp, AlertOctagon,
  ExternalLink, FileText, RefreshCw, Loader2,
} from "lucide-react";
import { cn, riskBadgeClass, scoreColor, formatDateTime, scenarioLabel, providerLabel } from "@/lib/utils";
import { api, AuditListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user }               = useAuth();
  const [audits, setAudits]    = useState<AuditListItem[]>([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.audit.list();
      setAudits(res.audits ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load audits");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const total    = audits.length;
  const avgScore = total
    ? Math.round(audits.reduce((s, a) => s + (a.fairness_score ?? 0), 0) / total)
    : 0;
  const critical = audits.filter(
    a => a.risk_level === "critical" || a.risk_level === "non_compliant"
  ).length;

  const METRICS = [
    { label: "Total Audits",        value: total,                icon: FlaskConical, color: "text-brand",                bg: "bg-brand-muted" },
    { label: "Avg Fairness Score",  value: total ? avgScore : "—", icon: TrendingUp, color: avgScore >= 80 ? "text-risk-compliant" : avgScore >= 60 ? "text-risk-at_risk" : "text-risk-non_compliant", bg: "bg-green-50" },
    { label: "Critical Findings",   value: critical,             icon: AlertOctagon, color: critical > 0 ? "text-risk-non_compliant" : "text-risk-compliant", bg: critical > 0 ? "bg-red-50" : "bg-green-50" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">
            {user?.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your AI bias audit history and compliance overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/audit/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New Audit
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {METRICS.map(m => (
          <div key={m.label} className="card px-5 py-5 flex items-center gap-4">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0", m.bg)}>
              <m.icon className={cn("h-5 w-5", m.color)} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{m.label}</p>
              <p className={cn("text-2xl font-bold mt-0.5", m.color)}>{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div>
        <h2 className="section-title mb-4">Audit History</h2>

        {loading && (
          <div className="card p-16 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        )}
        {error && (
          <div className="card p-6 text-center text-sm text-red-600">{error}</div>
        )}
        {!loading && !error && audits.length === 0 && (
          <div className="card p-16 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-brand-muted flex items-center justify-center">
              <FlaskConical className="h-6 w-6 text-brand" />
            </div>
            <div>
              <p className="font-semibold text-[#1A1A2E]">No audits yet</p>
              <p className="text-sm text-gray-400 mt-1">Run your first AI bias audit to see results here.</p>
            </div>
            <Link href="/audit/new" className="btn-primary mt-2">
              <Plus className="h-4 w-4" /> Start your first audit
            </Link>
          </div>
        )}
        {!loading && !error && audits.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-content-border bg-gray-50">
                  {["Date","Audit","Provider","Scenario","Score","Risk","Actions"].map(h => (
                    <th key={h} className={cn(
                      "px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide",
                      h === "Actions" ? "text-right" : h === "Score" || h === "Risk" ? "text-center" : "text-left"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-content-border">
                {audits.map(audit => (
                  <tr key={audit.audit_id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {audit.created_at ? formatDateTime(audit.created_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1A1A2E] truncate max-w-48">{audit.label ?? "Untitled"}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{audit.audit_id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{providerLabel(audit.provider ?? "")}</td>
                    <td className="px-4 py-3 text-gray-600">{scenarioLabel(audit.scenario ?? "")}</td>
                    <td className="px-4 py-3 text-center">
                      {audit.fairness_score != null ? (
                        <span className="font-mono font-bold text-base" style={{ color: scoreColor(audit.fairness_score) }}>
                          {audit.fairness_score.toFixed(0)}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {audit.risk_level ? (
                        <span className={cn("badge text-[10px]", riskBadgeClass(audit.risk_level))}>
                          {audit.risk_level.replace(/_/g, " ").toUpperCase()}
                        </span>
                      ) : (
                        <span className="badge badge-neutral text-[10px]">{(audit.status ?? "—").replace(/_/g, " ")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/audit/${audit.audit_id}`} className="btn-ghost px-2 py-1.5 text-xs">
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </Link>
                        {audit.latest_report_id && (
                          <Link href={`/reports/${audit.audit_id}`} className="btn-ghost px-2 py-1.5 text-xs">
                            <FileText className="h-3.5 w-3.5" /> Report
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
