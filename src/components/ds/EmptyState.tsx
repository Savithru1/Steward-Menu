import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState(props: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  const Icon = props.icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 text-center max-w-md mx-auto",
        "rounded-3xl border border-[rgba(27,18,13,0.08)] bg-[rgba(255,255,255,0.22)] backdrop-blur-xl",
        "p-8 shadow-[0_18px_50px_rgba(27,18,13,0.10)]",
        props.className
      )}
    >
      <div className="h-14 w-14 rounded-2xl border border-[rgba(27,18,13,0.10)] bg-[rgba(255,255,255,0.35)] grid place-items-center mb-6">
        <Icon className="h-6 w-6 text-[rgba(27,18,13,0.55)]" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{props.title}</h3>
      <p className="text-sm text-[rgba(27,18,13,0.72)] mt-2 leading-relaxed">{props.description}</p>
      {props.actionLabel && props.onAction && (
        <button
          type="button"
          onClick={props.onAction}
          className={cn(
            "mt-7 rounded-full px-6 py-3 text-xs font-semibold tracking-tight",
            "bg-[rgba(27,18,13,0.92)] text-[#F1E7B8] shadow-[0_18px_45px_rgba(27,18,13,0.18)]",
            "hover:bg-[rgba(27,18,13,0.86)] transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,18,13,0.22)]"
          )}
        >
          {props.actionLabel}
        </button>
      )}
    </div>
  );
}

