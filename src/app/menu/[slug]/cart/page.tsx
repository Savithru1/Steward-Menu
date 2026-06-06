"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, ClipboardList, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyState } from "@/components/ds/EmptyState";
import { useCartStore } from "@/store/cartStore";
import { useConsent } from "@/components/consent/ConsentProvider";
import { persistToStorage } from "@/hooks/useGuestIdentity";
import { getGuestId } from "@/hooks/useGuestIdentity";
import { useRestaurant } from "@/components/providers/RestaurantContext";

export default function CartPage() {
  const { offlineMode } = useRestaurant();
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const menuHref = `/menu/${slug}`;
  const checkoutHref = `/menu/${slug}/checkout`;
  const myOrdersHref = `/menu/${slug}/my-orders`;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const tax = useCartStore((s) => s.tax());
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clearCart);

  const { consent, requestConsent } = useConsent();

  if (!mounted) {
    return (
      <main className="min-h-screen pb-20 bg-[var(--surface-raised)]">
        <PageHeader backHref={menuHref} label="Your order" />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin text-[rgba(var(--on-surface-rgb),0.45)]" />
        </div>
      </main>
    );
  }

  const handleCheckout = () => {
    if (consent === "accepted") {
      router.push(checkoutHref);
      return;
    }

    requestConsent(() => {
      const guestId = getGuestId();
      if (guestId) persistToStorage(guestId);
      router.push(checkoutHref);
    });
  };

  if (offlineMode) {
    return (
      <main className="min-h-screen pb-20 bg-[var(--surface-raised)]">
        <PageHeader backHref={menuHref} label="Your order" />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <EmptyState
            icon={ShoppingBag}
            title="Ordering unavailable"
            description="Online ordering is currently turned off. Please try again later."
            actionLabel="Return to menu"
            onAction={() => (window.location.href = menuHref)}
          />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen pb-20 bg-[var(--surface-raised)]">
        <PageHeader backHref={menuHref} label="Your order" />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Add a few items from the menu to get started."
            actionLabel="Browse menu"
            onAction={() => (window.location.href = menuHref)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 bg-[var(--surface-raised)]">
      <PageHeader backHref={menuHref} label="Your order">
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={myOrdersHref}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)] text-[rgba(var(--on-surface-rgb),0.55)] hover:text-foreground hover:bg-[rgba(var(--on-surface-rgb),0.12)] transition-colors"
          >
            <ClipboardList className="h-3 w-3" />
            Orders
          </Link>
          <button
            type="button"
            onClick={clearCart}
            className="rounded-full px-3 py-1.5 text-[11px] font-medium border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)] text-[rgba(var(--on-surface-rgb),0.55)] hover:text-[#F87171] hover:border-[rgba(248,113,113,0.20)] hover:bg-[rgba(248,113,113,0.06)] transition-colors"
          >
            Clear
          </button>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-3">
          {items.map((ci) => (
            <CartItem key={ci.menuItemId} cartItem={ci} />
          ))}
        </div>

        <CartSummary subtotal={subtotal} tax={tax} total={total} />

        <button
          type="button"
          onClick={handleCheckout}
          className="w-full rounded-full px-6 py-4 text-sm font-semibold tracking-tight bg-[rgba(var(--on-surface-rgb),0.92)] text-[var(--surface-raised)] shadow-[0_22px_60px_rgba(var(--on-surface-rgb),0.18)] hover:bg-[rgba(var(--on-surface-rgb),0.86)] transition-colors active:scale-[0.98] active:duration-75"
        >
          Checkout · ₹{total}
        </button>
      </div>
    </main>
  );
}

function PageHeader({
  backHref,
  label,
  children,
}: {
  backHref: string;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--surface-raised)]/85 backdrop-blur-xl border-b border-[rgba(var(--on-surface-rgb),0.08)]">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center gap-3">
        <Link
          href={backHref}
          className="grid h-10 w-10 place-items-center rounded-full border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)] hover:bg-[rgba(var(--on-surface-rgb),0.12)] transition-colors"
          aria-label="Back to menu"
        >
          <ArrowLeft className="h-4 w-4 text-[rgba(var(--on-surface-rgb),0.70)]" />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {label}
        </h1>
        {children}
      </div>
    </header>
  );
}
