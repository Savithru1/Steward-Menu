"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { useCartStore, getCartItemKey } from "@/store/cartStore";
import { QuantitySelector } from "./QuantitySelector";
import { ModifierGroupSelector } from "./ModifierGroupSelector";
import { PriceSummary } from "./PriceSummary";
import { useItemModifiers } from "@/hooks/useItemModifiers";
import { cn } from "@/lib/utils";
import type { ApiMenuItem, SelectedModifier } from "@/types";
import { telemetry } from "@/lib/telemetry";
import { useRestaurant } from "@/components/providers/RestaurantContext";

export function ItemModal(props: {
  item: ApiMenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  // Optional pre-filled modifiers for editing from cart
  initialSelectedModifiers?: SelectedModifier[];
  // If editing, we pass the unique cart item key so we know what key to update/remove
  editCartItemKey?: string;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const items = useCartStore((s) => s.items);
  const { slug, theme } = useRestaurant();

  const item = props.item;

  const { data: modifierGroups = [], isLoading, isError, refetch } = useItemModifiers(slug, item?.id || null);

  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset or pre-fill selections when modal opens or item changes
  useEffect(() => {
    if (props.isOpen && item) {
      if (props.initialSelectedModifiers) {
        setSelectedModifiers(props.initialSelectedModifiers);
        // Pre-fill quantity if editing
        const existingQty = props.editCartItemKey ? useCartStore.getState().getQuantity(props.editCartItemKey) : 1;
        setQuantity(existingQty || 1);
      } else {
        setSelectedModifiers([]);
        setQuantity(1);
      }
      setValidationErrors({});
    }
  }, [props.isOpen, item, props.initialSelectedModifiers, props.editCartItemKey]);

  // Pre-fill defaults for required single-option groups when modifiers load
  useEffect(() => {
    if (props.isOpen && modifierGroups.length > 0 && !props.initialSelectedModifiers) {
      const defaults: SelectedModifier[] = [];
      modifierGroups.forEach((groupLink) => {
        const { modifierGroup, required, minimumSelections, maximumSelections } = groupLink;
        // If it's a required group and has exactly 1 min/max choice (radio-like size selection), select the first option by default
        if (required && minimumSelections === 1 && maximumSelections === 1 && modifierGroup.options.length > 0) {
          const firstOpt = [...modifierGroup.options].sort((a, b) => a.displayOrder - b.displayOrder)[0];
          defaults.push({
            optionId: firstOpt.id,
            optionName: firstOpt.name,
            groupId: modifierGroup.id,
            groupName: modifierGroup.name,
            priceAdjustment: Number(firstOpt.priceAdjustment),
          });
        }
      });
      if (defaults.length > 0) {
        setSelectedModifiers(defaults);
      }
    }
  }, [modifierGroups, props.isOpen, props.initialSelectedModifiers]);

  if (!item) return null;

  const handleModifierChange = (groupId: string, options: SelectedModifier[]) => {
    setSelectedModifiers((prev) => {
      const filtered = prev.filter((m) => m.groupId !== groupId);
      return [...filtered, ...options];
    });

    // Clear error for this group if resolved
    if (validationErrors[groupId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[groupId];
        return copy;
      });
    }
  };

  const validateSelections = (): boolean => {
    const errors: Record<string, string> = {};

    modifierGroups.forEach((groupLink) => {
      const { modifierGroup, required, minimumSelections, maximumSelections } = groupLink;
      const selections = selectedModifiers.filter((m) => m.groupId === modifierGroup.id);

      if (required && selections.length < minimumSelections) {
        errors[modifierGroup.id] = `Please select at least ${minimumSelections} option(s).`;
      } else if (selections.length > maximumSelections) {
        errors[modifierGroup.id] = `Please select at most ${maximumSelections} option(s).`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onAddOrUpdate = () => {
    if (!validateSelections()) {
      // Scroll to first error element or show a warning toast
      const firstErrorGroupId = Object.keys(validationErrors)[0];
      if (firstErrorGroupId) {
        const el = document.getElementById(`group-${firstErrorGroupId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (props.editCartItemKey) {
      // We are editing: remove old key, add item with new selections
      removeItem(props.editCartItemKey);
      addItem(item, selectedModifiers, quantity);
      if (theme.restaurantId) {
        telemetry.track(theme.restaurantId, "add_to_cart", { itemId: item.id, itemName: item.name });
      }
    } else {
      // Regular addition
      addItem(item, selectedModifiers, quantity);
      if (theme.restaurantId) {
        telemetry.track(theme.restaurantId, "add_to_cart", { itemId: item.id, itemName: item.name });
      }
    }

    props.onClose();
  };

  const currentSelectionPrice = item.price + selectedModifiers.reduce((sum, m) => sum + m.priceAdjustment, 0);

  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 overflow-hidden rounded-2xl border border-border bg-popover text-foreground",
          "shadow-[0_30px_90px_rgba(0,0,0,0.70)] sm:max-w-[520px] max-h-[90vh] flex flex-col"
        )}
      >
        {/* Sticky top / Image section */}
        <div className="relative h-44 sm:h-56 w-full flex-shrink-0 bg-card">
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
              <div className="h-12 w-12 rounded-2xl border border-border bg-muted" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 to-popover/80" />

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

        {/* Scrollable details and customization selectors */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5 no-scrollbar">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/45">
                {item.isVeg ? "Veg" : "Non-veg"}
              </span>
              {item.isPopular && (
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                  ★ Popular
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {item.name}
            </h2>
            {item.description && (
              <p className="mt-2 text-xs sm:text-sm text-foreground/45 leading-relaxed font-medium">
                {item.description}
              </p>
            )}
          </div>

          {/* Loading / Error handling for modifiers fetch */}
          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs text-foreground/40 font-medium">Loading customization options...</span>
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-center space-y-3">
              <div className="flex justify-center text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-foreground/80">Failed to load customizations</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-xs font-bold text-primary underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          ) : (
            modifierGroups.length > 0 && (
              <div className="space-y-6">
                {modifierGroups.map((groupLink) => (
                  <div key={groupLink.modifierGroupId} id={`group-${groupLink.modifierGroupId}`}>
                    <ModifierGroupSelector
                      groupLink={groupLink}
                      selectedModifiers={selectedModifiers}
                      onChange={handleModifierChange}
                      error={validationErrors[groupLink.modifierGroupId]}
                    />
                  </div>
                ))}
              </div>
            )
          )}

          {/* Price details summary card */}
          {selectedModifiers.length > 0 && (
            <PriceSummary
              itemName={item.name}
              basePrice={item.price}
              selectedModifiers={selectedModifiers}
              quantity={quantity}
            />
          )}
        </div>

        {/* Sticky bottom CTA panel */}
        <div className="sticky bottom-0 border-t border-border bg-popover/95 backdrop-blur px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
          <QuantitySelector
            value={quantity}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => q + 1)}
          />

          <button
            type="button"
            onClick={onAddOrUpdate}
            className={cn(
              "flex-1 rounded-full py-3.5 px-6 text-sm font-semibold tracking-tight",
              "bg-primary text-primary-foreground",
              "hover:opacity-90 transition-opacity active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            {props.editCartItemKey ? "Update order" : "Add to order"} · ₹{(currentSelectionPrice * quantity).toFixed(2)}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
