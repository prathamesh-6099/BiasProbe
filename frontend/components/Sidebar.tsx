"use client";
/**
 * components/Sidebar.tsx
 * Dark sidebar navigation — Linear-style.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { href: "/audit/new",  label: "New Audit",    icon: FlaskConical },
  { href: "/reports",    label: "Reports",      icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar-bg flex-shrink-0">
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-sidebar-text-active tracking-tight">
          BiasProbe
        </span>
        <span className="ml-auto rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
          BETA
        </span>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                active ? "sidebar-item-active" : "sidebar-item"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── User / Sign out ── */}
      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        <button className="sidebar-item w-full">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
        <button
          onClick={handleSignOut}
          className="sidebar-item w-full text-left text-red-400 hover:text-red-300 hover:bg-red-950/20"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>

        {/* User chip */}
        {user && (
          <div className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 bg-sidebar-hover">
            <div className="h-6 w-6 rounded-full bg-brand flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-text-active">
                {user.displayName ?? "User"}
              </p>
              <p className="truncate text-[10px] text-sidebar-text">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
