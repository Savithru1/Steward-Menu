"use client";

import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { QuantitySelector } from "./QuantitySelector";
import { cn } from "@/lib/utils";
import type { ApiMenuItem } from "@/types";

export function ItemModal(props: {
  item: ApiMenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const item = props.item;

  const quantity = useCartStore((s) => (item ? s.getQuantity(item.id) : 0));

  if (!item) return null;

  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 overflow-hidden rounded-2xl border border-border",
          "bg-popover text-foreground",
          "shadow-[0_30px_90px_rgba(0,0,0,0.70)] sm:max-w-[520px]"
        )}
      >
        <div className="relative h-56 sm:h-72 w-full bg-card">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="520px"
              className="object-cover opacity-90"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-14 w-14 rounded-2xl border border-border bg-muted" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 to-popover/60" />

          <button
            type="button"
            onClick={props.onClose}
            className={cn(
              "absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full",
              "border border-border bg-background/50 backdrop-blur-md",
              "text-foreground/70 hover:text-foreground hover:bg-background/70 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-foreground/45">
              {item.isVeg ? "Veg" : "Non-veg"}
            </span>
            {item.isPopular && (
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[10px] font-medium text-foreground/45">
                Popular
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight text-foreground">
            {item.name}
          </h2>
          <p className="mt-3 text-sm text-foreground/45 leading-relaxed">
            {item.description}
          </p>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-base font-semibold tabular-nums text-foreground">
              ₹{item.price}
            </div>
            <div className="text-xs text-foreground/35">
              {item.prepTimeMins} min
            </div>
          </div>

          <div className="mt-5">
            {!item.isAvailable ? (
              <div className="w-full py-3 text-center rounded-full border border-border text-[11px] font-medium text-foreground/30">
                Currently unavailable
              </div>
            ) : quantity === 0 ? (
              <button
                type="button"
                onClick={() => addItem(item)}
                className={cn(
                  "w-full rounded-full py-3 text-sm font-semibold tracking-tight",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 transition-opacity",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                Add to order
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-full border border-border bg-muted px-5 py-2.5">
                <span className="text-sm text-foreground/60">In your order</span>
                <QuantitySelector
                  value={quantity}
                  onDecrement={() => updateQuantity(item.id, quantity - 1)}
                  onIncrement={() => updateQuantity(item.id, quantity + 1)}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
