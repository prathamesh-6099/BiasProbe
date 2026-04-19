import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BiasProbe — AI Bias Auditing Platform",
  description: "Automated demographic bias testing for GenAI applications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
