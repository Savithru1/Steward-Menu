"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";

import { useCartStore, getCartItemKey } from "@/store/cartStore";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { useRestaurant } from "@/components/providers/RestaurantContext";
import { cn } from "@/lib/utils";
import { telemetry } from "@/lib/telemetry";

export function FloatingCartButton() {
  const { slug, theme } = useRestaurant();
  const checkoutHref = `/menu/${slug}/checkout`;

  const [isOpen, setIsOpen] = useState(false);

  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());
  const tax = useCartStore((s) => s.tax());
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clearCart);

  const hasItems = itemCount > 0;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const floatingLabel = useMemo(() => {
    if (itemCount === 1) return "1 item";
    return `${itemCount} items`;
  }, [itemCount]);

  return (
    <>
      {/* Floating pill */}
      <AnimatePresence>
        {hasItems && !isOpen && (
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-4 right-4 z-40 mx-auto max-w-sm sm:left-auto sm:right-6 sm:max-w-none gpu-smooth"
          >
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className={cn(
                "w-full sm:w-auto rounded-full border border-primary/20",
                "bg-primary text-primary-foreground shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
                "px-5 py-3.5 flex items-center justify-between gap-5",
                "hover:opacity-90 transition-opacity duration-150 active:scale-[0.97] active:duration-75 tap-smooth",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="h-5 w-5 text-primary-foreground" />
                  <span className="absolute -top-2 -right-2 h-4.5 min-w-[18px] px-1 rounded-full bg-primary-foreground text-primary text-[9px] font-semibold grid place-items-center">
                    {itemCount}
                  </span>
                </div>
                <span className="text-xs font-medium tracking-tight text-primary-foreground/70">
                  {floatingLabel}
                </span>
              </div>
              <div className="text-sm font-semibold tracking-tight text-primary-foreground tabular-nums">
                ₹{total}
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-in drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md",
                "bg-popover border-l border-border",
                "shadow-[0_30px_80px_rgba(0,0,0,0.62)] flex flex-col gpu-smooth"
              )}
              aria-label="Cart drawer"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 px-6 pt-6 pb-4 border-b border-border bg-popover">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      Your order
                    </h3>
                    <p className="text-xs text-foreground/35 mt-0.5">
                      {theme.restaurantName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/menu/${slug}/my-orders`}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-medium",
                        "border border-border bg-accent",
                        "text-foreground/45 hover:text-foreground/70 hover:bg-muted transition-colors"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      My orders
                    </Link>
                    <button
                      type="button"
                      onClick={clearCart}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-medium",
                        "border border-border bg-accent",
                        "text-foreground/45 hover:text-foreground/70 hover:bg-muted transition-colors"
                      )}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full",
                        "border border-border bg-accent",
                        "hover:bg-muted transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      )}
                      aria-label="Close cart"
                    >
                      <X className="h-4 w-4 text-foreground/50" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 no-scrollbar">
                <div className="space-y-3">
                  {items.map((ci) => (
                    <CartItem key={getCartItemKey(ci.menuItemId, ci.selectedModifiers)} cartItem={ci} />
                  ))}
                </div>
                <CartSummary subtotal={subtotal} tax={tax} total={total} />
              </div>

              {/* CTA */}
              <div className="sticky bottom-0 px-6 py-5 border-t border-border bg-popover">
                <Link 
                  href={checkoutHref} 
                  prefetch={true} 
                  onClick={() => {
                    setIsOpen(false);
                    if (theme.restaurantId) {
                      telemetry.track(theme.restaurantId, "checkout_start", { itemCount, total });
                    }
                  }}
                >
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-full px-6 py-3.5 text-sm font-semibold tracking-tight",
                      "bg-primary text-primary-foreground",
                      "hover:opacity-90 transition-opacity",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    Checkout · ₹{total}
                  </button>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
