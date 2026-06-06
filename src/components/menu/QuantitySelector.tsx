"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";

type Size = "sm" | "md";

export function QuantitySelector(props: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  disabledIncrement?: boolean;
  className?: string;
  size?: Size;
  "aria-label"?: string;
}) {
  const size = props.size ?? "md";
  const dims = size === "sm" ? "h-8" : "h-10";
  const btn = size === "sm" ? "w-8" : "w-10";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const valueW = size === "sm" ? "w-7 text-xs" : "w-8 text-sm";

  return (
    <div
      aria-label={props["aria-label"] ?? "Quantity selector"}
      className={cn(
        "inline-flex items-center overflow-hidden rounded-full border border-border bg-accent backdrop-blur-xl",
        "shadow-[0_10px_30px_rgba(0,0,0,0.10)]",
        dims,
        props.className
      )}
    >
      <button
        type="button"
        onClick={props.onDecrement}
        className={cn(
          "grid place-items-center text-foreground/80 transition-colors active:bg-muted",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          btn,
          "h-full"
        )}
      >
        {props.value <= 1 ? <Trash2 className={cn(icon, "text-foreground/55")} /> : <Minus className={icon} />}
        <span className="sr-only">Decrease</span>
      </button>

      <span className={cn("grid place-items-center font-semibold tabular-nums text-foreground", valueW)}>
        {props.value}
      </span>

      <button
        type="button"
        onClick={props.onIncrement}
        disabled={props.disabledIncrement}
        className={cn(
          "grid place-items-center text-foreground/80 transition-colors active:bg-muted",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:opacity-40 disabled:pointer-events-none",
          btn,
          "h-full"
        )}
      >
        <Plus className={icon} />
        <span className="sr-only">Increase</span>
      </button>
    </div>
  );
}

