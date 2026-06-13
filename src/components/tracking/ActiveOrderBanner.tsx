"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChefHat, ArrowRight, Clock, CheckCircle } from "lucide-react";
import { useGuestOrders } from "@/hooks/useOrder";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

export function ActiveOrderBanner() {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  
  // Fetch guest orders (has built-in socket listening for status changes)
  const { data: orders = [] } = useGuestOrders(slug);
  
  // Check if we are already on the tracking page to avoid showing the duplicate banner
  const isTrackingPage = pathname.includes("/tracking");

  // Find active orders (NEW, PREPARING, READY)
  const activeOrder = useMemo(() => {
    if (isTrackingPage || !orders) return null;
    
    // Sort so latest active order is shown first
    const active = orders
      .filter((o) => o.status === "NEW" || o.status === "PREPARING" || o.status === "READY")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
    return active[0] || null;
  }, [orders, isTrackingPage]);

  // Check if cart has items to adjust banner position
  const cartItemsCount = useCartStore((s) => s.itemCount());
  const hasCartItems = cartItemsCount > 0;

  if (!activeOrder) return null;

  // Custom styling based on order status
  const statusConfig = {
    NEW: {
      label: "Order Placed",
      icon: Clock,
      colorClass: "text-amber-400 bg-amber-400/10 border-amber-400/20",
      dotClass: "bg-amber-400",
    },
    PREPARING: {
      label: "Preparing",
      icon: ChefHat,
      colorClass: "text-sky-400 bg-sky-400/10 border-sky-400/20",
      dotClass: "bg-sky-400",
    },
    READY: {
      label: "Ready to Pick Up",
      icon: CheckCircle,
      colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
      dotClass: "bg-emerald-400 animate-pulse",
    },
  }[activeOrder.status as "NEW" | "PREPARING" | "READY"] || {
    label: "Ongoing Order",
    icon: Clock,
    colorClass: "text-foreground/60 bg-muted border-border",
    dotClass: "bg-foreground/40",
  };

  const StatusIcon = statusConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ 
          y: 0, 
          opacity: 1,
          bottom: hasCartItems ? "92px" : "24px" // Stack above floating cart if present
        }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-4 right-4 z-40 mx-auto max-w-sm sm:left-auto sm:right-6 sm:max-w-xs gpu-smooth"
      >
        <Link href={`/menu/${slug}/tracking?id=${activeOrder.id}`}>
          <div className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/80 backdrop-blur-md px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all hover:bg-background hover:border-primary/30 active:scale-[0.98] cursor-pointer">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-accent transition-colors">
                <StatusIcon className="h-5 w-5 text-foreground/70" />
                <span className={cn("absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full ring-2 ring-background", statusConfig.dotClass)} />
              </div>
              
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 leading-none">
                  Active Order #{activeOrder.orderNumber.slice(-5)}
                </div>
                <div className="text-xs font-semibold text-foreground mt-1 leading-none flex items-center gap-1.5">
                  {statusConfig.label}
                  {activeOrder.status === "PREPARING" && (
                    <span className="inline-flex h-1 w-1 rounded-full bg-primary animate-ping" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
