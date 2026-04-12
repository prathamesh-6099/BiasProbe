"use client";

export default function AuditStatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    created: "badge-created",
    queued: "badge-queued",
    running: "badge-running",
    completed: "badge-completed",
    failed: "badge-failed",
  };

  return (
    <span className={`badge ${classMap[status] || "badge-created"}`}>
      {status === "running" && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#3b82f6",
            marginRight: 6,
            display: "inline-block",
            animation: "pulse-glow 1.5s infinite",
          }}
        />
      )}
      {status}
    </span>
  );
}
