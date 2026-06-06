"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { QuantitySelector } from "./QuantitySelector";
import type { ApiMenuItem } from "@/types";
import { useRestaurant } from "@/components/providers/RestaurantContext";

export function MenuCard(props: {
  item: ApiMenuItem;
  onOpen: (item: ApiMenuItem) => void;
}) {
  const item = props.item;
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const quantity = useCartStore((s) => s.getQuantity(item.id));
  const { theme } = useRestaurant();

  const showPrepTime = theme.showPrepTime ?? true;
  const showVegBadge = theme.showVegBadge ?? true;
  const showCalories = theme.showCalories ?? true;

  const onAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(item);
  };

  const onInc = () => updateQuantity(item.id, quantity + 1);
  const onDec = () => updateQuantity(item.id, quantity - 1);

  return (
    <motion.div
      layout
      whileHover={item.isAvailable ? { y: -1 } : undefined}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => item.isAvailable && props.onOpen(item)}
      className={cn(
        "group cursor-pointer select-none rounded-2xl border border-border gpu-smooth tap-smooth",
        "bg-card hover:bg-accent transition-colors duration-200",
        "p-5 sm:p-6 flex gap-5",
        !item.isAvailable && "opacity-40 cursor-not-allowed"
      )}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {showVegBadge && (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-foreground/40">
                {item.isVeg ? "Veg" : "Non-veg"}
              </span>
            )}
            {item.isPopular && (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-foreground/40">
                Popular
              </span>
            )}
            {!item.isAvailable && (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-foreground/30">
                Sold out
              </span>
            )}
          </div>

          <h3 className="text-[15px] sm:text-base font-semibold tracking-tight text-foreground leading-snug truncate">
            {item.name}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-foreground/45 line-clamp-2">
            {item.description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-semibold tracking-tight text-foreground tabular-nums">
              ₹{item.price}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/30 mt-0.5 flex-wrap">
              {showPrepTime && <span>{item.prepTimeMins} min</span>}
              {showCalories && item.calories && (
                <>
                  {showPrepTime && <span>·</span>}
                  <span>{item.calories} kcal</span>
                </>
              )}
            </div>
          </div>

          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {!item.isAvailable ? (
              <span className="inline-flex items-center rounded-full border border-border px-4 py-2 text-[11px] font-medium text-foreground/25">
                Unavailable
              </span>
            ) : quantity === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className={cn(
                  "rounded-full px-5 py-2 text-xs font-semibold tracking-tight",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 transition-opacity duration-150 active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                Add
              </button>
            ) : (
              <QuantitySelector
                value={quantity}
                onDecrement={onDec}
                onIncrement={onInc}
              />
            )}
          </div>
        </div>
      </div>

      <div className="relative h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-card">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 112px, 128px"
            className={cn(
              "object-cover transition-transform duration-500 ease-out gpu-smooth",
              item.isAvailable ? "group-hover:scale-[1.04]" : "grayscale"
            )}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-8 w-8 rounded-full border border-border" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
