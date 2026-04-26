/**
 * lib/api.ts
 * All backend calls to the BiasProbe FastAPI.
 * Attaches Firebase ID token on every request.
 */
import { auth } from "./firebase";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// --------------------------------------------------------------------------
// Core fetch wrapper
// --------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth.currentUser;
  let token = "";
  if (user) {
    token = await user.getIdToken();
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) {
        detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch (_) {}
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface AuditCreatePayload {
  label?:            string;
  scenario:          string;
  num_probes:        number;
  attribute_filter:  string[];
  connector: {
    provider:       string;
    model:          string;
    api_key?:       string;
    base_url?:      string;   // override for mock API / Azure / Together
    system_prompt?: string;
  };
}

export interface AuditStatus {
  audit_id:        string;
  status:          string;
  progress?:       number;  // 0-100 (legacy)
  percent_done?:   number;  // 0-100 (from backend)
  probes_sent?:    number;
  probes_complete?: number;
  probes_success?: number;
  probes_failed?:  number;
  scenario?:       string;
  label?:          string;
  message?:        string;
}

export interface AuditResults {
  audit_id:        string;
  status:          string;
  fairness_score:  number;
  risk_level:      string;
  per_attribute:   Record<string, AttributeResult>;
  judgements?:     JudgementPair[];
  regulatory_flags?: string[];
}

export interface AttributeResult {
  fairness_score:       number;
  severity:             string;
  significant_findings: StatFinding[];
  regulatory_flags:     RegFlag[];
}

export interface StatFinding {
  dimension:         string;
  group_a:           string;
  group_b:           string;
  mean_delta:        number;
  p_value:           number;
  cohens_d:          number;
  effect_size_label: string;
}

export interface RegFlag {
  regulation_name: string;
  article?:        string;
}

export interface JudgementPair {
  pair_id:            string;
  attribute_tested:   string;
  group_a:            string;
  group_b:            string;
  composite_delta:    number;
  prompt_a?:          string;
  prompt_b?:          string;
  response_a?:        string;
  response_b?:        string;
  score_a:            Record<string, number | string>;
  score_b:            Record<string, number | string>;
  triggered_thresholds: string[];
}

export interface AuditListItem {
  audit_id:              string;
  label:                 string;
  scenario:              string;
  provider:              string;
  status:                string;
  fairness_score?:       number;
  risk_level?:           string;
  certification_eligible?: boolean;
  created_at?:           string;
  latest_report_id?:     string;
}

export interface GenerateReportResponse {
  audit_id: string;
  status:   string;
  message:  string;
}

export interface ReportData {
  report_id:              string;
  audit_id:               string;
  executive_summary:      string;
  fairness_score:         number;
  risk_level:             string;
  key_findings:           KeyFinding[];
  remediation_steps:      RemediationStep[];
  certification_eligible: boolean;
  tested_at:              string;
  methodology:            string;
  gcs_pdf_uri?:           string;
  pdf_signed_url?:        string;
}

export interface KeyFinding {
  attribute:          string;
  finding:            string;
  evidence:           string;
  statistical_basis:  string;
  severity:           string;
  regulatory_flags:   string[];
}

export interface RemediationStep {
  priority:           number;
  action:             string;
  technical_approach: string;
  effort:             string;
  expected_impact:    string;
}

// --------------------------------------------------------------------------
// Audit API
// --------------------------------------------------------------------------

export const api = {
  audit: {
    create: (payload: AuditCreatePayload) =>
      apiFetch<{ audit_id: string }>("/api/audit/create", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    run: (auditId: string) =>
      apiFetch<{ audit_id: string; status: string }>(`/api/audit/${auditId}/run`, {
        method: "POST",
      }),

    runWithConfig: (auditId: string, connector: AuditCreatePayload["connector"]) =>
      apiFetch<{ audit_id: string; status: string }>(`/api/audit/${auditId}/run-with-config`, {
        method: "POST",
        body: JSON.stringify({ connector }),
      }),

    status: (auditId: string) =>
      apiFetch<AuditStatus>(`/api/audit/${auditId}/status`),

    results: async (auditId: string): Promise<AuditResults> => {
      let stats: any = null;
      let judgements: any[] = [];

      // Stats may not be available (e.g. 202 if analysis hasn't run yet)
      try {
        stats = await apiFetch<any>(`/api/stats/${auditId}/report`);
      } catch (e: any) {
        console.warn("Stats not available:", e.message);
      }

      try {
        const judgementsRes = await apiFetch<any>(`/api/judge/${auditId}/judgements?limit=50`);
        judgements = judgementsRes.judgements || [];
      } catch (e: any) {
        console.warn("Judgements not available:", e.message);
      }

      return {
        audit_id: auditId,
        status: stats ? "analysed" : "partial",
        fairness_score: stats?.overall_fairness_score ?? 0,
        risk_level: stats?.overall_severity ?? "unknown",
        per_attribute: stats?.per_attribute ?? {},
        judgements,
        regulatory_flags: stats?.unique_regulations_triggered ?? [],
      };
    },

    list: () =>
      apiFetch<{ audits: AuditListItem[] }>("/api/audit/list"),

    testConnection: (
      provider: string,
      apiKey: string,
      model: string,
      baseUrl?: string,
      systemPrompt?: string,
    ) =>
      apiFetch<{ ok: boolean; message?: string }>("/api/audit/test-connection", {
        method: "POST",
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          model,
          ...(baseUrl      ? { base_url:      baseUrl      } : {}),
          ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
        }),
      }),
  },

  report: {
    generate: (auditId: string) =>
      apiFetch<GenerateReportResponse>(`/api/report/${auditId}/generate`, {
        method: "POST",
      }),

    latest: (auditId: string) =>
      apiFetch<ReportData>(`/api/report/${auditId}/latest`),

    get: (auditId: string, reportId: string) =>
      apiFetch<ReportData>(`/api/report/${auditId}/${reportId}`),

    pdf: (auditId: string, reportId: string) =>
      apiFetch<{ signed_url: string; expires_in: string }>(
        `/api/report/${auditId}/${reportId}/pdf`
      ),
  },
};
