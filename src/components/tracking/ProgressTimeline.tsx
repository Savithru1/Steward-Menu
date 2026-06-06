"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TrackingStatus = "placed" | "preparing" | "ready";

const STEPS: { id: TrackingStatus; label: string; description: string }[] = [
  {
    id: "placed",
    label: "Order Placed",
    description: "We've received your order and it's in the queue.",
  },
  {
    id: "preparing",
    label: "Preparing",
    description: "The kitchen is working on your order now.",
  },
  {
    id: "ready",
    label: "Ready",
    description: "Your order is ready — come pick it up!",
  },
];

const STATUS_ORDER: TrackingStatus[] = ["placed", "preparing", "ready"];

// Accent color per step when active/completed
const STEP_ACCENT: Record<TrackingStatus, string> = {
  placed: "#D97706",    // amber
  preparing: "#3B82F6", // blue
  ready: "#10B981",     // emerald
};

export function ProgressTimeline(props: { currentStatus: TrackingStatus }) {
  const currentIndex = STATUS_ORDER.indexOf(props.currentStatus);

  return (
    <div className="space-y-0">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const accent = STEP_ACCENT[step.id];

        return (
          <div key={step.id} className="flex gap-5 items-start">
            {/* Icon column */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-7 w-7 rounded-full border flex items-center justify-center transition-all duration-300",
                  isCompleted
                    ? "border-[rgba(var(--on-surface-rgb),0.20)] bg-[rgba(var(--on-surface-rgb),0.15)]"
                    : isCurrent
                    ? "border-[rgba(var(--on-surface-rgb),0.20)] bg-[rgba(var(--on-surface-rgb),0.08)]"
                    : "border-[rgba(var(--on-surface-rgb),0.08)] bg-transparent"
                )}
                style={
                  isCurrent
                    ? {
                        boxShadow: `0 0 0 3px ${accent}22`,
                        borderColor: `${accent}55`,
                      }
                    : {}
                }
              >
                {isCompleted ? (
                  <Check
                    className="h-4 w-4 text-foreground"
                    strokeWidth={2.5}
                  />
                ) : isCurrent ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    style={{ color: accent }}
                  />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-[rgba(var(--on-surface-rgb),0.18)]" />
                )}
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-px h-12 my-1 transition-all duration-500",
                    index < currentIndex
                      ? "bg-[rgba(var(--on-surface-rgb),0.20)]"
                      : "bg-[rgba(var(--on-surface-rgb),0.07)]"
                  )}
                />
              )}
            </div>

            {/* Text column */}
            <div className="flex-1 pt-0.5 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "text-[11px] font-medium tracking-[0.16em] uppercase transition-colors",
                    isCurrent || isCompleted
                      ? "text-[rgba(var(--on-surface-rgb),0.80)]"
                      : "text-[rgba(var(--on-surface-rgb),0.35)]"
                  )}
                >
                  {step.label}
                </div>
                {isCurrent && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: `${accent}15`,
                      color: accent,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ background: accent }}
                    />
                    Now
                  </span>
                )}
              </div>
              {isCurrent && (
                <div className="mt-1.5 text-sm text-[rgba(var(--on-surface-rgb),0.55)] leading-relaxed">
                  {step.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
