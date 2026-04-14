"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { signInWithGoogle, onAuthChange } from "@/lib/firebase";
import type { User } from "firebase/auth";

const FEATURES = [
  {
    icon: "🧠",
    title: "Dynamic Probing",
    desc: "AI-generated probes tailored to your specific application domain — not generic static templates.",
  },
  {
    icon: "📊",
    title: "Statistical Rigor",
    desc: "Welch's t-test, chi-square, and ANOVA ensure bias findings are statistically significant.",
  },
  {
    icon: "🔬",
    title: "Multi-Axis Testing",
    desc: "Test across gender, race, age — and intersectional combinations for compound bias detection.",
  },
  {
    icon: "📄",
    title: "PDF Reports",
    desc: "Generate professional audit reports with bias heatmaps, scoreboards, and remediation advice.",
  },
  {
    icon: "🔗",
    title: "CI/CD Webhooks",
    desc: "Integrate bias checks into your deployment pipeline. Fail builds that exceed bias thresholds.",
  },
  {
    icon: "🏛️",
    title: "Compliance Mapping",
    desc: "Map findings to EU AI Act, NIST AI RMF, and NYC Local Law 144 for regulatory audits.",
  },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(setUser);
    return () => unsubscribe();
  }, []);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "120px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background gradient orbs */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            top: "10%",
            left: "10%",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
            bottom: "10%",
            right: "15%",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />

        {/* Badge */}
        <div
          className="animate-fade-in-up"
          style={{
            padding: "6px 16px",
            background: "var(--accent-glow)",
            border: "1px solid var(--border-glow)",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent-primary)",
            marginBottom: 32,
          }}
        >
          🔍 Open Source LLM Bias Auditing
        </div>

        <h1
          className="animate-fade-in-up"
          style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 900,
            lineHeight: 1.1,
            maxWidth: 800,
            marginBottom: 24,
            letterSpacing: "-2px",
            animationDelay: "0.1s",
          }}
        >
          Audit your AI for{" "}
          <span className="gradient-text">demographic bias</span>
        </h1>

        <p
          className="animate-fade-in-up"
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--text-secondary)",
            maxWidth: 600,
            marginBottom: 48,
            lineHeight: 1.7,
            animationDelay: "0.2s",
          }}
        >
          BiasProbe sends statistically-designed probe prompts to your AI,
          measures response differences across gender, race, and age, and
          generates actionable remediation reports.
        </p>

        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            gap: 16,
            animationDelay: "0.3s",
          }}
        >
          {user ? (
            <button
              className="btn-primary"
              style={{ padding: "14px 32px", fontSize: 16 }}
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard →
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ padding: "14px 32px", fontSize: 16 }}
              onClick={() => signInWithGoogle()}
            >
              Get Started — Free
            </button>
          )}
          <a
            href="https://github.com/DevJay067/BiasProbe"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ padding: "14px 32px", fontSize: 16 }}
          >
            ⭐ Star on GitHub
          </a>
        </div>

        {/* Stats strip */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            gap: 48,
            marginTop: 80,
            animationDelay: "0.4s",
          }}
        >
          {[
            { value: "30+", label: "Bias Probes" },
            { value: "3", label: "Bias Categories" },
            { value: "100%", label: "Open Source" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                className="gradient-text"
                style={{ fontSize: 32, fontWeight: 800 }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section
        style={{
          padding: "80px 24px 120px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontSize: 36,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 16,
            letterSpacing: "-1px",
          }}
        >
          Built for{" "}
          <span className="gradient-text">responsible AI teams</span>
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 16,
            maxWidth: 500,
            margin: "0 auto 56px",
          }}
        >
          Everything you need to test, measure, and improve fairness in your
          GenAI applications.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass-card animate-fade-in-up"
              style={{
                padding: 32,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "40px 24px",
          borderTop: "1px solid var(--border-color)",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        <span className="gradient-text" style={{ fontWeight: 700 }}>
          BiasProbe
        </span>{" "}
        — Open source LLM bias auditing. MIT License.
      </footer>
    </>
  );
}
