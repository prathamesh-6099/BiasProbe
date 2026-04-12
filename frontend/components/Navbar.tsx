"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signInWithGoogle, signOut, onAuthChange } from "@/lib/firebase";
import type { User } from "firebase/auth";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(setUser);
    return () => unsubscribe();
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(10, 10, 15, 0.8)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 24 }}>🔍</span>
          <span
            className="gradient-text"
            style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}
          >
            BiasProbe
          </span>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user && (
            <>
              <Link
                href="/dashboard"
                style={{
                  padding: "8px 16px",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: "var(--radius-sm)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Dashboard
              </Link>
              <Link
                href="/audit/new"
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                + New Audit
              </Link>
            </>
          )}

          {/* Auth Button */}
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  marginLeft: 8,
                }}
              >
                {user.displayName?.[0]?.toUpperCase() || "U"}
              </button>
              {menuOpen && (
                <div
                  className="glass-card"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 44,
                    minWidth: 200,
                    padding: 8,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border-color)",
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {user.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {user.email}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await signOut();
                      setMenuOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      color: "var(--score-red)",
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(239,68,68,0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="btn-primary"
              style={{ padding: "8px 20px", fontSize: 13 }}
            >
              Sign In with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
