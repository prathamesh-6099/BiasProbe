"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AuditStatusBadge from "@/components/AuditStatusBadge";
import { onAuthChange } from "@/lib/firebase";
import { listAudits, type AuditSummary } from "@/lib/api";
import type { User } from "firebase/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      if (!u) {
        router.push("/");
      } else {
        // Fetch audits from the real API
        fetchAudits();
      }
    });
    return () => unsubscribe();
  }, [router]);

  async function fetchAudits() {
    setLoading(true);
    setError(null);
    try {
      const data = await listAudits();
      setAudits(data);
    } catch (err) {
      console.error("Failed to fetch audits:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch audits");
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

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
            marginBottom: 40,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: "-1px",
                marginBottom: 4,
              }}
            >
              Dashboard
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
              Welcome back, {user.displayName?.split(" ")[0] || "there"}. Here
              are your bias audits.
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => router.push("/audit/new")}
          >
            + New Audit
          </button>
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
              marginBottom: 24,
            }}
          >
            {error}
          </div>
        )}

        {/* Audit List or Empty State */}
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 16,
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="shimmer"
                style={{
                  height: 160,
                  borderRadius: "var(--radius-lg)",
                }}
              />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: "80px 40px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 20 }}>🔍</div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              No audits yet
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 15,
                maxWidth: 400,
                margin: "0 auto 32px",
                lineHeight: 1.7,
              }}
            >
              Start your first bias audit by providing your AI endpoint and
              selecting probe categories. We&apos;ll handle the rest.
            </p>
            <button
              className="btn-primary"
              style={{ padding: "14px 32px", fontSize: 15 }}
              onClick={() => router.push("/audit/new")}
            >
              Create Your First Audit →
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 16,
            }}
          >
            {audits.map((audit) => (
              <div
                key={audit.auditId}
                className="glass-card"
                style={{
                  padding: 24,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onClick={() => router.push(`/audit/${audit.auditId}`)}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <AuditStatusBadge status={audit.status} />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontFamily: "monospace",
                    }}
                  >
                    {audit.auditId.slice(0, 8)}...
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {audit.targetEndpoint}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    {audit.probeMode} probing
                  </span>
                  {audit.overallScore !== undefined && (
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                      }}
                      className={
                        audit.overallScore < 0.25
                          ? "score-low"
                          : audit.overallScore < 0.5
                          ? "score-moderate"
                          : audit.overallScore < 0.75
                          ? "score-high"
                          : "score-severe"
                      }
                    >
                      {audit.overallScore.toFixed(2)}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 12,
                  }}
                >
                  {new Date(audit.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
