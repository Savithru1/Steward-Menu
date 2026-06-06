import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant = "new" | "preparing" | "ready" | "completed" | "cancelled" | "neutral";

interface StatusIndicatorProps {
  status: StatusVariant;
  label?: string;
  pulse?: boolean;
  className?: string;
}

const statusMap: Record<StatusVariant, { dot: string; text: string; bg: string }> = {
  new: { dot: "bg-amber-400", text: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  preparing: { dot: "bg-purple-400", text: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
  ready: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  completed: { dot: "bg-zinc-400", text: "text-zinc-400", bg: "bg-white/[0.05] border-white/10" },
  cancelled: { dot: "bg-rose-500", text: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  neutral: { dot: "bg-zinc-500", text: "text-zinc-400", bg: "bg-white/[0.05] border-white/10" },
};

export function StatusIndicator({ status, label, pulse = false, className }: StatusIndicatorProps) {
  const config = statusMap[status] || statusMap.neutral;
  
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 border shadow-inner", config.bg, className)}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && <span className={cn("absolute inset-0 rounded-full opacity-50 animate-ping", config.dot)} />}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dot)} />
      </span>
      {label && <span className={cn("text-[10px] font-bold uppercase tracking-widest", config.text)}>{label}</span>}
    </div>
  );
}
