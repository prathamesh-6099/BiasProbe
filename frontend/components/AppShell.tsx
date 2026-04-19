"use client";
/**
 * components/AppShell.tsx
 * Wraps authenticated pages with: AuthProvider + dark sidebar + white content.
 * Used by app/dashboard/layout.tsx, app/audit/layout.tsx, app/reports/layout.tsx
 */
import { AuthProvider } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-sidebar-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-content-bg">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
