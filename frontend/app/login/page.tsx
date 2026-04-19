"use client";
/**
 * app/login/page.tsx — Firebase Google sign-in
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { signInWithGoogle, auth, onAuthStateChanged } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) router.replace("/dashboard");
    });
    return unsub;
  }, [router]);

  async function handleSignIn() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err: any) {
      console.error("Sign-in error:", err);
      // Show user-friendly error
      if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site and try again.");
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized. Add 'localhost' to Firebase Console → Authentication → Authorized domains.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Google Sign-In is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.");
      } else {
        setError(err.message || "Sign-in failed. Check the browser console for details.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F7F7F8" }}>

      {/* ── Left dark panel ── */}
      <div className="hidden lg:flex w-[480px] flex-col justify-between p-12" style={{ backgroundColor: "#0F0F1A" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: "#4C6EF5" }}>
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">BiasProbe</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Audit your AI for<br />
            <span style={{ color: "#748FFC" }}>demographic bias</span>
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#8B8FA8" }}>
            Run structured bias probes across 5 scenario types. Get statistical
            reports, regulatory flags, and remediation steps — all powered by Gemini.
          </p>

          <ul className="space-y-3 mt-4">
            {[
              "Gender, race, age & religion bias testing",
              "Mann-Whitney U + Cohen's d statistics",
              "EU AI Act & EEOC regulatory mapping",
              "Gemini-written compliance PDF reports",
            ].map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#8B8FA8" }}>
                <span className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(76,110,245,0.2)" }}>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="#4C6EF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs" style={{ color: "#8B8FA8" }}>
          BiasProbe Beta · Free on Gemini free tier
        </p>
      </div>

      {/* ── Right sign-in panel ── */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "#4C6EF5" }}>
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold" style={{ color: "#1A1A2E" }}>BiasProbe</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#1A1A2E" }}>Sign in</h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Continue to your bias auditing workspace
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "12px 24px",
              backgroundColor: "white",
              border: "1.5px solid #E5E7EB",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: "500",
              color: "#1A1A2E",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.15s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
            onMouseEnter={e => {
              if (!loading) (e.target as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
            }}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            ) : (
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          <p className="text-center text-xs text-gray-400">
            By signing in, you agree to our{" "}
            <a href="#" className="underline hover:text-gray-600">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
