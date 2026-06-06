"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FilterChip {
  id: string;
  label: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  activeId?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function FilterChips({ chips, activeId, onChange, className }: FilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {chips.map((chip) => {
        const isActive = activeId === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onChange?.(chip.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 border flex-shrink-0 touch-target active:scale-95",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(var(--color-primary)/0.2)]"
                : "bg-secondary text-foreground/40 border-border/50 hover:border-border hover:text-foreground hover:bg-accent"
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
