import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CartItem as CartItemType, useCartStore, getCartItemKey } from "@/store/cartStore";
import { QuantitySelector } from "@/components/menu/QuantitySelector";
import { ItemModal } from "@/components/menu/ItemModal";
import { Pencil } from "lucide-react";
import type { ApiMenuItem } from "@/types";

export function CartItem(props: { cartItem: CartItemType }) {
  const ci = props.cartItem;
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [isEditing, setIsEditing] = useState(false);

  const itemKey = getCartItemKey(ci.menuItemId, ci.selectedModifiers);
  const subtotal = ci.unitPrice * ci.quantity;

  const mockApiItem: ApiMenuItem = {
    id: ci.menuItemId,
    name: ci.name,
    description: "",
    price: ci.price,
    imageUrl: ci.imageUrl ?? "",
    isVeg: ci.isVeg,
    isAvailable: true,
    categoryId: "",
    prepTimeMins: 15,
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card",
        "p-4 flex gap-4"
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-[72px] w-[72px] sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-card">
        {ci.imageUrl ? (
          <Image
            src={ci.imageUrl}
            alt={ci.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-8 w-8 rounded-full border border-border bg-accent" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
        <div className="min-w-0">
          {/* Veg/non-veg + unit price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-foreground/40">
                {ci.isVeg ? "Veg" : "Non-veg"}
              </span>
              <span className="text-[11px] text-foreground/25">·</span>
              <span className="text-[11px] text-foreground/40">
                ₹{ci.unitPrice} each
              </span>
            </div>

            {/* Edit button */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" /> Customize
            </button>
          </div>

          {/* Name + line total */}
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h4 className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">
              {ci.name}
            </h4>
            <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-foreground">
              ₹{subtotal.toFixed(2)}
            </span>
          </div>

          {/* Modifiers List */}
          {ci.selectedModifiers && ci.selectedModifiers.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {ci.selectedModifiers.map((mod) => (
                <span
                  key={mod.optionId}
                  className="inline-flex items-center rounded-full bg-accent/40 border border-border px-2 py-0.5 text-[10px] text-foreground/50 font-medium"
                >
                  {mod.optionName}
                  {mod.priceAdjustment > 0 && ` (+₹${mod.priceAdjustment})`}
                </span>
              ))}
            </div>
          )}

          {ci.notes && (
            <p className="mt-1 text-[11px] text-foreground/35 truncate">
              Note: {ci.notes}
            </p>
          )}
        </div>

        <QuantitySelector
          size="sm"
          value={ci.quantity}
          onDecrement={() =>
            ci.quantity <= 1
              ? removeItem(itemKey)
              : updateQuantity(itemKey, ci.quantity - 1)
          }
          onIncrement={() =>
            updateQuantity(itemKey, ci.quantity + 1)
          }
        />
      </div>

      <ItemModal
        item={mockApiItem}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        initialSelectedModifiers={ci.selectedModifiers}
        editCartItemKey={itemKey}
      />
    </div>
  );
}
