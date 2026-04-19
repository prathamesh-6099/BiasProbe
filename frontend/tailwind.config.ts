/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system — Linear meets Stripe
        sidebar: {
          bg: "#0D0D10",
          border: "#1E1E24",
          hover: "#16161C",
          active: "#1E1E28",
          text: "#8B8B9A",
          "text-active": "#F0F0F5",
        },
        content: {
          bg: "#FAFAFA",
          border: "#E8E8EC",
        },
        brand: {
          DEFAULT: "#3B5BDB",    // Stripe-like blue
          light: "#4C6EF5",
          dark: "#2F4AC0",
          muted: "#EEF2FF",
        },
        // Severity / risk system
        risk: {
          compliant: "#12B76A",
          at_risk: "#F79009",
          non_compliant: "#F04438",
          critical: "#7A0018",
        },
        severity: {
          low: "#12B76A",
          medium: "#F79009",
          high: "#F04438",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.12)",
        badge: "0 0 0 1px rgba(0,0,0,0.06)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "score-fill": {
          from: { "stroke-dashoffset": "283" },
          to: { "stroke-dashoffset": "var(--target-offset)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out forwards",
        "slide-in-left": "slide-in-left 0.2s ease-out forwards",
        "score-fill": "score-fill 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
    },
  },
  plugins: [],
};
