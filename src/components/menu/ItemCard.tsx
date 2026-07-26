"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Plus, Minus, Clock } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import type { ApiMenuItem } from "@/types";
import { useRestaurant } from "@/components/providers/RestaurantContext";

interface ItemCardProps {
  item: ApiMenuItem;
  onClick: (item: ApiMenuItem) => void;
}

/**
 * Theme-aware item card (used in featured / horizontal scroll contexts).
 * All colours are driven by CSS custom properties so admin branding applies.
 */
export function ItemCard({ item, onClick }: ItemCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const quantity = useCartStore((state) => state.getQuantity(item.id));
  const { theme } = useRestaurant();

  const showCalories = theme.showCalories ?? true;
  const showPrepTime = theme.showPrepTime ?? true;
  const showVegBadge = theme.showVegBadge ?? true;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(item);
  };
  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(item.id, quantity + 1);
  };
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(item.id, quantity - 1);
  };

  return (
    <div
      onClick={() => item.isAvailable && onClick(item)}
      className={cn(
        "group relative flex gap-4 sm:gap-6 p-5 sm:p-6 rounded-3xl bg-card border border-border transition-colors duration-200 cursor-pointer select-none gpu-smooth tap-smooth",
        "hover:border-border hover:bg-accent",
        !item.isAvailable && "opacity-40 cursor-not-allowed"
      )}
    >
      {/* Text Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
            {showVegBadge && (item.isVeg ? (
              <div className="flex items-center gap-1 border border-emerald-500/25 rounded px-1.5 py-0.5 bg-emerald-500/5 shadow-inner">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                  Veg
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 border border-rose-500/25 rounded px-1.5 py-0.5 bg-rose-500/5 shadow-inner">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                  Non-veg
                </span>
              </div>
            ))}
            {item.isPopular && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full shadow-inner">
                ★ Popular
              </span>
            )}
          </div>

          <h3 className="font-extrabold text-foreground mb-2 text-base sm:text-lg leading-tight tracking-tight transition-colors">
            {item.name}
          </h3>
          <p className="text-xs sm:text-sm text-foreground/45 line-clamp-2 leading-relaxed mb-5 font-medium">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              ₹{item.price}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-foreground/40 mt-1 font-bold uppercase tracking-widest flex-wrap">
              {showPrepTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{item.prepTimeMins} min</span>
                </div>
              )}
              {showCalories && item.calories && (
                <div className="flex items-center gap-1">
                  {showPrepTime && <span className="text-foreground/20">·</span>}
                  <span>{item.calories} kcal</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
            {!item.isAvailable ? (
              <span className="text-[10px] text-foreground/40 font-bold bg-card px-3 py-1.5 rounded-md tracking-widest uppercase border border-border">
                Unavailable
              </span>
            ) : (
              <button
                onClick={() => onClick(item)}
                className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-black tracking-tight text-primary-foreground hover:opacity-90 transition-opacity duration-150 active:scale-[0.96]"
              >
                {quantity > 0 ? `IN ORDER (${quantity})` : "ADD"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Food Image */}
      <div className="relative flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden bg-card border border-border self-start shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 128px, 160px"
            onLoad={() => setImgLoaded(true)}
            className={cn(
              "object-cover transition-[opacity,transform,filter] duration-500 ease-out group-hover:scale-[1.04] gpu-smooth",
              imgLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-sm",
              !item.isAvailable && "grayscale"
            )}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-10 w-10 rounded-full bg-card border border-border" />
          </div>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
            <span className="text-[9px] font-extrabold text-foreground/60 uppercase tracking-widest text-center px-1.5 py-0.5 bg-background/40 rounded border border-border leading-tight">
              Sold Out
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
