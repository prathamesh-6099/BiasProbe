/**
 * BiasProbe — API Client
 * Typed fetch wrappers for all backend endpoints.
 */

import { getIdToken } from "./firebase";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditConfig {
  probe_count: number;
  intersectional: boolean;
  semantic_similarity: boolean;
  webhook_url?: string;
}

export interface AuditCreateRequest {
  target_endpoint: string;
  target_system_prompt?: string;
  probe_template_ids: string[];
  probe_mode: "static" | "dynamic";
  config: AuditConfig;
}

export interface AuditProgress {
  completed: number;
  total: number;
}

export interface AuditResponse {
  audit_id: string;
  status: string;
  progress: AuditProgress;
  probe_mode: string;
  probe_template_ids: string[];
  target_endpoint: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface AuditStatusResponse {
  audit_id: string;
  status: string;
  progress: AuditProgress;
  started_at?: string;
  completed_at?: string;
}

export interface ProbeResultMetrics {
  response_length: number;
  sentiment: number;
  refusal_detected: boolean;
}

export interface ProbeResult {
  probe_id: string;
  category: string;
  variant_group: string;
  prompt: string;
  response: string;
  metrics: ProbeResultMetrics;
}

export interface BiasScore {
  category: string;
  score_type: string;
  score: number;
  p_value: number;
  significance_level: string;
  details: Record<string, unknown>;
}

export interface AuditResultsResponse {
  audit_id: string;
  status: string;
  bias_scores: BiasScore[];
  probe_results: ProbeResult[];
  overall_score: number;
  probe_template_versions: Record<string, string>;
}

export interface ReportResponse {
  report_id: string;
  audit_id: string;
  pdf_url?: string;
  generated_at?: string;
}

export interface AuditSummary {
  auditId: string;
  status: string;
  targetEndpoint: string;
  probeMode: string;
  overallScore?: number;
  createdAt: string;
}

// ── Fetch Helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token: string | null = null;
  try {
    token = await getIdToken();
  } catch {
    // Auth not initialized or user not logged in — continue without token
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  return res.json() as Promise<T>;
}

// ── Audit Endpoints ───────────────────────────────────────────────────────────

export async function createAudit(req: AuditCreateRequest): Promise<AuditResponse> {
  return apiFetch<AuditResponse>("/api/audit/create", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function runAudit(auditId: string): Promise<AuditStatusResponse> {
  return apiFetch<AuditStatusResponse>(`/api/audit/${auditId}/run`, {
    method: "POST",
  });
}

export async function getAuditStatus(auditId: string): Promise<AuditStatusResponse> {
  return apiFetch<AuditStatusResponse>(`/api/audit/${auditId}/status`);
}

export async function getAuditResults(auditId: string): Promise<AuditResultsResponse> {
  return apiFetch<AuditResultsResponse>(`/api/audit/${auditId}/results`);
}

export async function listAudits(): Promise<AuditSummary[]> {
  const data = await apiFetch<{ audits: AuditSummary[] }>("/api/audit/list/all");
  return data.audits;
}

// ── Report Endpoints ──────────────────────────────────────────────────────────

export async function generateReport(auditId: string): Promise<ReportResponse> {
  return apiFetch<ReportResponse>(`/api/report/${auditId}/generate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getReportPdfUrl(auditId: string): string {
  return `${API_BASE}/api/report/${auditId}/pdf`;
}
