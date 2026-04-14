import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BiasProbe — LLM Bias Auditing Platform",
  description:
    "Audit your GenAI applications for demographic bias across gender, race, and age. Get statistical analysis, heatmaps, and actionable remediation reports.",
  keywords: ["LLM bias", "AI audit", "bias testing", "GenAI", "fairness", "responsible AI"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
