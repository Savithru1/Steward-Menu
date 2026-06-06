"use client";

import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";

/**
 * CartSummary — shows subtotal, dynamic tax line (reads actual taxRate from store),
 * and total. Designed for the dark cart drawer.
 *
 * FIX: Was hardcoding "GST (5%)" regardless of restaurant taxRate.
 *      Now reads taxRate from the store and formats it dynamically.
 *
 * FIX: Was using light-mode rgba colours (rgba(27,18,13,...)) inside a dark shell.
 *      Now uses pure dark-theme values consistent with the cart drawer.
 */
export function CartSummary(props: {
  subtotal: number;
  tax: number;
  total: number;
  className?: string;
}) {
  const taxRate = useCartStore((s) => s.taxRate);
  const taxPercent = Math.round(taxRate * 100);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card",
        "p-5",
        props.className
      )}
    >
      <h3 className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/40">
        Summary
      </h3>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between text-foreground/60">
          <span>Subtotal</span>
          <span className="font-medium tabular-nums text-foreground">₹{props.subtotal.toFixed(2)}</span>
        </div>

        {taxPercent > 0 && (
          <div className="flex justify-between text-foreground/60">
            <span>GST ({taxPercent}%)</span>
            <span className="font-medium tabular-nums text-foreground">₹{props.tax.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-border flex justify-between items-baseline">
          <span className="text-foreground/60">Total</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">
            ₹{props.total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
