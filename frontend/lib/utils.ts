/**
 * lib/utils.ts — shared utility helpers
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function riskBadgeClass(risk: string): string {
  const map: Record<string, string> = {
    compliant:     "badge-compliant",
    at_risk:       "badge-at_risk",
    non_compliant: "badge-non_compliant",
    critical:      "badge-critical",
  };
  return map[risk] ?? "badge-neutral";
}

export function severityBadgeClass(sev: string): string {
  const map: Record<string, string> = {
    low:    "badge-low",
    medium: "badge-medium",
    high:   "badge-high",
  };
  return map[sev] ?? "badge-neutral";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "#12B76A";
  if (score >= 60) return "#F79009";
  if (score >= 40) return "#F04438";
  return "#7A0018";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function scenarioLabel(scenario: string): string {
  const map: Record<string, string> = {
    hiring_assistant:  "Hiring Assistant",
    loan_advisor:      "Loan Advisor",
    medical_triage:    "Medical Triage",
    customer_support:  "Customer Support",
    content_moderator: "Content Moderator",
  };
  return map[scenario] ?? scenario.replace(/_/g, " ");
}

export function providerLabel(provider: string): string {
  const map: Record<string, string> = {
    openai:    "OpenAI",
    gemini:    "Gemini",
    anthropic: "Anthropic",
    custom:    "Custom Endpoint",
  };
  return map[provider] ?? provider;
}
