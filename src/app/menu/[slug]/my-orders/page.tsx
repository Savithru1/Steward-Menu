"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  ChefHat,
  Bell,
} from "lucide-react";
import { useGuestOrders } from "@/hooks/useOrder";
import { useConsent } from "@/components/consent/ConsentProvider";
import { CancelOrderButton } from "@/components/tracking/CancelOrderButton";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import type { OrderStatus } from "@/types";

// ── Status config — warm dark-mode palette ─────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    icon: React.ElementType;
  }
> = {
  NEW: {
    label: "Placed",
    textClass: "text-[#D97706]",
    bgClass: "bg-[rgba(217,119,6,0.10)]",
    borderClass: "border-[rgba(217,119,6,0.22)]",
    icon: Clock,
  },
  PREPARING: {
    label: "Preparing",
    textClass: "text-[#3B82F6]",
    bgClass: "bg-[rgba(59,130,246,0.10)]",
    borderClass: "border-[rgba(59,130,246,0.22)]",
    icon: ChefHat,
  },
  READY: {
    label: "Ready!",
    textClass: "text-[#10B981]",
    bgClass: "bg-[rgba(16,185,129,0.10)]",
    borderClass: "border-[rgba(16,185,129,0.22)]",
    icon: Bell,
  },
  COMPLETED: {
    label: "Completed",
    textClass: "text-[rgba(245,245,245,0.45)]",
    bgClass: "bg-[rgba(245,245,245,0.05)]",
    borderClass: "border-[rgba(245,245,245,0.10)]",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    textClass: "text-[#F87171]",
    bgClass: "bg-[rgba(248,113,113,0.08)]",
    borderClass: "border-[rgba(248,113,113,0.18)]",
    icon: XCircle,
  },
};

// Local-storage key for dismissed order IDs
const DISMISSED_KEY = "steward_dismissed_orders";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {}
}

export default function MyOrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: orders, isLoading, isError } = useGuestOrders(slug);
  const { consent } = useConsent();
  const menuHref = `/menu/${slug}`;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Local dismissed set — persisted in localStorage
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  const handleDismiss = (orderId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      saveDismissed(next);
      return next;
    });
    toast.success("Order removed from history");
  };

  if (!mounted) {
    return (
      <main className="min-h-screen pb-24 bg-[var(--surface-raised)]">
        <PageHeader menuHref={menuHref} />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-4">
          <div className="space-y-4 w-full">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.06)] bg-[rgba(var(--on-surface-rgb),0.04)] p-5 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2 w-10 bg-[rgba(var(--on-surface-rgb),0.08)] rounded" />
                    <div className="h-5 w-24 bg-[rgba(var(--on-surface-rgb),0.12)] rounded" />
                  </div>
                  <div className="h-6 w-16 bg-[rgba(var(--on-surface-rgb),0.08)] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const visibleOrders = orders?.filter((o) => !dismissed.has(o.id));

  // ── Declined consent ──────────────────────────────────────────────────────
  if (consent === "declined") {
    return (
      <main className="min-h-screen pb-24 bg-[var(--surface-raised)]">
        <PageHeader menuHref={menuHref} />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
          <div className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-12 shadow-[0_18px_50px_rgba(var(--on-surface-rgb),0.08)]">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[rgba(var(--on-surface-rgb),0.06)] border border-[rgba(var(--on-surface-rgb),0.08)]">
              <ShoppingBag className="h-6 w-6 text-[rgba(var(--on-surface-rgb),0.40)]" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">
              Order history unavailable
            </p>
            <p className="mt-2 text-[12px] text-[rgba(var(--on-surface-rgb),0.55)] leading-relaxed">
              You declined cookie storage. Order history requires a cookie to
              identify your device.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen pb-24 bg-[var(--surface-raised)]">
      <PageHeader menuHref={menuHref} />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-4">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4 w-full">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.06)] bg-[rgba(var(--on-surface-rgb),0.04)] p-5 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2 w-10 bg-[rgba(var(--on-surface-rgb),0.08)] rounded" />
                    <div className="h-5 w-24 bg-[rgba(var(--on-surface-rgb),0.12)] rounded" />
                  </div>
                  <div className="h-6 w-16 bg-[rgba(var(--on-surface-rgb),0.08)] rounded-full" />
                </div>
                <div className="space-y-2 border-t border-[rgba(var(--on-surface-rgb),0.05)] pt-3">
                  <div className="h-4 w-3/4 bg-[rgba(var(--on-surface-rgb),0.06)] rounded" />
                  <div className="h-4 w-1/2 bg-[rgba(var(--on-surface-rgb),0.04)] rounded" />
                </div>
                <div className="h-7 w-20 bg-[rgba(var(--on-surface-rgb),0.08)] rounded-full self-end ml-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] p-8 text-center">
            <p className="text-sm font-semibold text-[#F87171]">
              Failed to load orders
            </p>
            <p className="mt-1 text-[12px] text-[rgba(var(--on-surface-rgb),0.55)]">
              Please try refreshing the page.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading &&
          !isError &&
          (visibleOrders ?? []).length === 0 &&
          dismissed.size === 0 && (
            <div className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-12 text-center shadow-[0_18px_50px_rgba(var(--on-surface-rgb),0.08)]">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[rgba(var(--on-surface-rgb),0.06)] border border-[rgba(var(--on-surface-rgb),0.08)]">
                <ShoppingBag className="h-6 w-6 text-[rgba(var(--on-surface-rgb),0.40)]" />
              </div>
              <p className="text-[14px] font-semibold text-foreground">
                No orders yet
              </p>
              <p className="mt-1 text-[12px] text-[rgba(var(--on-surface-rgb),0.55)]">
                Orders you place from this device will appear here.
              </p>
              <Link href={menuHref} className="inline-flex mt-6">
                <button className="rounded-full px-6 py-3 text-[12px] font-semibold bg-[rgba(var(--on-surface-rgb),0.92)] text-[var(--surface-raised)] hover:bg-[rgba(var(--on-surface-rgb),0.82)] transition-colors">
                  Browse menu
                </button>
              </Link>
            </div>
          )}

        {/* All dismissed state */}
        {!isLoading &&
          !isError &&
          (visibleOrders ?? []).length === 0 &&
          dismissed.size > 0 && (
            <div className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-10 text-center">
              <p className="text-[13px] font-semibold text-foreground">
                History cleared
              </p>
              <p className="mt-1 text-[12px] text-[rgba(var(--on-surface-rgb),0.45)]">
                All orders have been removed from your view.
              </p>
            </div>
          )}

        {/* Order cards */}
        {visibleOrders?.map((order) => {
          const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.NEW;
          const StatusIcon = cfg.icon;
          const isActive =
            order.status === "NEW" ||
            order.status === "PREPARING" ||
            order.status === "READY";
          const isDismissible =
            order.status === "COMPLETED" || order.status === "CANCELLED";

          return (
            <div
              key={order.id}
              className="group rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-5 shadow-[0_8px_32px_rgba(var(--on-surface-rgb),0.06)] transition-all"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[rgba(var(--on-surface-rgb),0.45)]">
                    Order
                  </p>
                  <p className="mt-0.5 text-[18px] font-semibold tracking-tight text-foreground">
                    {order.orderNumber}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                      cfg.textClass,
                      cfg.bgClass,
                      cfg.borderClass
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </span>

                  {/* Dismiss button — only for terminal states */}
                  {isDismissible && (
                    <button
                      onClick={() => handleDismiss(order.id)}
                      title="Remove from history"
                      className="grid h-7 w-7 place-items-center rounded-full border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] text-[rgba(var(--on-surface-rgb),0.35)] hover:bg-[rgba(248,113,113,0.08)] hover:border-[rgba(248,113,113,0.20)] hover:text-[#F87171] transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="mt-3 space-y-1.5">
                {order.items.slice(0, 3).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-[rgba(var(--on-surface-rgb),0.65)]">
                      <span className="font-medium text-foreground">
                        {item.quantity}×
                      </span>{" "}
                      {item.name}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      ₹{Number(item.price) * item.quantity}
                    </span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-[11px] text-[rgba(var(--on-surface-rgb),0.45)]">
                    +{order.items.length - 3} more items
                  </p>
                )}
              </div>

              {/* Cancel button — own row, only for NEW orders */}
              {order.status === "NEW" && (
                <div className="mt-3">
                  <CancelOrderButton
                    orderId={order.id}
                    status={order.status}
                    placedAt={order.createdAt}
                  />
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-[rgba(var(--on-surface-rgb),0.07)] flex items-center justify-between gap-3">
                <div className="text-[11px] text-[rgba(var(--on-surface-rgb),0.45)]">
                  {formatDistanceToNow(new Date(order.createdAt), {
                    addSuffix: true,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold tabular-nums text-foreground">
                    ₹{Number(order.totalAmount).toFixed(0)}
                  </span>
                  {isActive && (
                    <Link href={`/menu/${slug}/tracking?id=${order.id}`}>
                      <button className="rounded-full px-3 py-1.5 text-[11px] font-semibold bg-[rgba(var(--on-surface-rgb),0.08)] text-[rgba(var(--on-surface-rgb),0.72)] hover:bg-[rgba(var(--on-surface-rgb),0.14)] transition-colors">
                        Track
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Order recovery */}
        <div className="pt-8 border-t border-[rgba(var(--on-surface-rgb),0.08)]">
          <OrderRecoverySection slug={slug} />
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PageHeader({ menuHref }: { menuHref: string }) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--surface-raised)]/85 backdrop-blur-xl border-b border-[rgba(var(--on-surface-rgb),0.08)]">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link
          href={menuHref}
          className="grid h-10 w-10 place-items-center rounded-full border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)] hover:bg-[rgba(var(--on-surface-rgb),0.12)] transition-colors"
          aria-label="Back to menu"
        >
          <ArrowLeft className="h-4 w-4 text-[rgba(var(--on-surface-rgb),0.70)]" />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          My Orders
        </h1>
      </div>
    </header>
  );
}

function OrderRecoverySection({ slug }: { slug: string }) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setLoading(true);
    try {
      const response = await api.get<{ data: { id: string } }>(
        "/orders/lookup",
        {
          params: {
            orderNumber: orderNumber.trim(),
            restaurantSlug: slug,
          },
        }
      );
      const order = response.data.data;
      if (order?.id) {
        toast.success("Order found!");
        router.push(`/menu/${slug}/tracking?id=${order.id}`);
      } else {
        toast.error("Order not found");
      }
    } catch (err) {
      const error = err as AxiosError<{ error?: { message?: string }; message?: string }>;
      toast.error(
        error.response?.data?.error?.message ??
          error.response?.data?.message ??
          "Order not found. Please verify the order number."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-6 shadow-sm">
      <h3 className="text-[14px] font-semibold text-foreground">
        Can&apos;t find your order?
      </h3>
      <p className="mt-1 text-[11px] text-[rgba(var(--on-surface-rgb),0.50)] leading-relaxed">
        If you placed an order but don&apos;t see it here, enter the order number
        (e.g. STW-0001) to track it directly.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="e.g. STW-0001"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          required
          className="flex-1 rounded-full border border-[rgba(var(--on-surface-rgb),0.12)] bg-[var(--surface-raised)] px-4 py-2 text-[12px] text-foreground placeholder:text-[rgba(var(--on-surface-rgb),0.35)] focus:border-[rgba(var(--on-surface-rgb),0.30)] focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full px-5 py-2 text-[12px] font-semibold bg-[rgba(var(--on-surface-rgb),0.92)] text-[var(--surface-raised)] hover:bg-[rgba(var(--on-surface-rgb),0.82)] transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
        >
          {loading ? "Searching..." : "Find"}
        </button>
      </form>
    </div>
  );
}
