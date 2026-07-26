import React from "react";
import type { SelectedModifier } from "@/types";

interface PriceSummaryProps {
  itemName: string;
  basePrice: number;
  selectedModifiers: SelectedModifier[];
  quantity: number;
}

export function PriceSummary({
  itemName,
  basePrice,
  selectedModifiers,
  quantity,
}: PriceSummaryProps) {
  const finalUnitPrice = basePrice + selectedModifiers.reduce((sum, m) => sum + m.priceAdjustment, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-foreground/45 font-medium">
        <span>{itemName} (Base)</span>
        <span className="tabular-nums">₹{basePrice.toFixed(2)}</span>
      </div>

      {selectedModifiers.map((mod) => (
        <div
          key={mod.optionId}
          className="flex items-center justify-between text-xs text-foreground/40"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] text-foreground/20">•</span>
            <span className="truncate">{mod.optionName}</span>
          </span>
          {mod.priceAdjustment > 0 ? (
            <span className="flex-shrink-0 tabular-nums">+₹{mod.priceAdjustment.toFixed(2)}</span>
          ) : (
            <span className="flex-shrink-0 text-emerald-400 font-medium">Free</span>
          )}
        </div>
      ))}

      <div className="border-t border-border pt-2.5 mt-2 flex items-baseline justify-between">
        <div className="text-xs font-semibold text-foreground">
          Unit Price
        </div>
        <div className="text-sm font-bold text-foreground tabular-nums">
          ₹{finalUnitPrice.toFixed(2)}
        </div>
      </div>

      {quantity > 1 && (
        <div className="flex items-baseline justify-between text-[11px] text-foreground/40 font-medium pt-0.5">
          <span>Total for Qty ×{quantity}</span>
          <span className="tabular-nums">₹{(finalUnitPrice * quantity).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
