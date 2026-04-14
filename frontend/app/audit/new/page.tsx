"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createAudit, runAudit } from "@/lib/api";

const PROBE_CATEGORIES = [
  {
    id: "gender-bias",
    label: "Gender Bias",
    desc: "Tests response differences based on gendered names/pronouns",
    icon: "♀♂",
  },
  {
    id: "racial-bias",
    label: "Racial Bias",
    desc: "Tests response differences based on race-coded names/contexts",
    icon: "🌍",
  },
  {
    id: "age-bias",
    label: "Age Bias",
    desc: "Tests response differences based on age indicators",
    icon: "👶🧓",
  },
];

export default function NewAuditPage() {
  const router = useRouter();
  const [endpoint, setEndpoint] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [probeMode, setProbeMode] = useState<"dynamic" | "static">("dynamic");
  const [probeCount, setProbeCount] = useState(10);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "gender-bias",
    "racial-bias",
    "age-bias",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpoint.trim()) {
      setError("Target endpoint URL is required");
      return;
    }
    if (selectedCategories.length === 0) {
      setError("Select at least one bias category");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const audit = await createAudit({
        target_endpoint: endpoint.trim(),
        target_system_prompt: systemPrompt.trim() || undefined,
        probe_template_ids: selectedCategories,
        probe_mode: probeMode,
        config: {
          probe_count: probeCount,
          intersectional: false,
          semantic_similarity: false,
        },
      });

      // Start the audit immediately
      await runAudit(audit.audit_id);

      router.push(`/audit/${audit.audit_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create audit");
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "96px 24px 60px",
        }}
      >
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-1px",
              marginBottom: 8,
            }}
          >
            New Bias Audit
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            Configure your audit parameters and we&apos;ll probe your AI for
            demographic bias.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Target Endpoint */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <label className="input-label" htmlFor="endpoint">
              Target LLM Endpoint *
            </label>
            <input
              id="endpoint"
              type="url"
              className="input-field"
              placeholder="https://your-api.com/v1/chat/completions"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              required
            />
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 8,
              }}
            >
              The API endpoint of the LLM you want to audit. Must accept POST
              requests with a JSON body containing a &quot;prompt&quot; or
              &quot;messages&quot; field.
            </p>
          </div>

          {/* System Prompt */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <label className="input-label" htmlFor="system-prompt">
              System Prompt{" "}
              <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <textarea
              id="system-prompt"
              className="input-field"
              placeholder="You are a helpful customer service agent for a bank..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
            />
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 8,
              }}
            >
              Providing the system prompt enables dynamic probe generation
              tailored to your application&apos;s domain.
            </p>
          </div>

          {/* Probe Mode */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <label className="input-label">Probe Mode</label>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {[
                {
                  value: "dynamic" as const,
                  label: "🧠 Dynamic",
                  desc: "AI-generated probes tailored to your app",
                },
                {
                  value: "static" as const,
                  label: "📋 Static",
                  desc: "Use pre-built probe templates",
                },
              ].map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setProbeMode(mode.value)}
                  style={{
                    flex: 1,
                    padding: "16px 20px",
                    background:
                      probeMode === mode.value
                        ? "var(--accent-glow)"
                        : "var(--bg-secondary)",
                    border:
                      probeMode === mode.value
                        ? "1px solid var(--accent-primary)"
                        : "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color:
                        probeMode === mode.value
                          ? "var(--accent-primary)"
                          : "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {mode.label}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {mode.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Bias Categories */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <label className="input-label">Bias Categories</label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 8,
              }}
            >
              {PROBE_CATEGORIES.map((cat) => {
                const selected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 18px",
                      background: selected
                        ? "var(--accent-glow)"
                        : "var(--bg-secondary)",
                      border: selected
                        ? "1px solid var(--accent-primary)"
                        : "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: selected
                          ? "none"
                          : "2px solid var(--border-color)",
                        background: selected
                          ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                          : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: selected
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        }}
                      >
                        {cat.icon} {cat.label}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {cat.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Probe Count */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <label className="input-label" htmlFor="probe-count">
              Probes Per Category
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <input
                id="probe-count"
                type="range"
                min={5}
                max={50}
                value={probeCount}
                onChange={(e) => setProbeCount(Number(e.target.value))}
                style={{ flex: 1, accentColor: "var(--accent-primary)" }}
              />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                  minWidth: 40,
                  textAlign: "right",
                }}
              >
                {probeCount}
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 8,
              }}
            >
              More probes = more statistical power but longer runtime.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "14px 20px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--score-red)",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              fontSize: 16,
              justifyContent: "center",
            }}
          >
            {loading ? "Creating Audit..." : "🚀 Launch Bias Audit"}
          </button>
        </form>
      </main>
    </>
  );
}
