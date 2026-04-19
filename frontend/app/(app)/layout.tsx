/**
 * app/(app)/layout.tsx — now unused passthrough (routes moved to non-group dirs)
 * Kept so next.js doesn't error on the (app) folder having no layout.
 */
export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
