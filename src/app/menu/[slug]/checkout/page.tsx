"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Wallet, CreditCard, QrCode, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

import { useCartStore } from "@/store/cartStore";
import { useCreateOrder } from "@/hooks/useOrder";
import { useRestaurant } from "@/components/providers/RestaurantContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import { api, extractApiError } from "@/lib/api";
import type { CreateOrderPayload, OrderType, OrderResponse } from "@/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const checkoutSchema = z.object({
  // Zod v4: use a plain string and treat empty string as absent at the payload
  // level. Avoid .optional().or(z.literal("")) unions — Zod v4 resolves them
  // differently from v3, causing false "required" validation errors.
  customerName: z.string().trim().min(0),
  customerPhone: z
    .string()
    .trim()
    .refine(
      (val) => !val || val === "" || /^\d{10}$/.test(val),
      "Enter a 10-digit mobile number"
    ),
  customerEmail: z
    .string()
    .trim()
    .refine(
      (value) => !value || value === "" || z.string().email().safeParse(value).success,
      "Enter a valid email"
    ),
  orderType: z.enum(["TAKEAWAY", "COUNTER_PICKUP"]),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// ── Customer info persistence ─────────────────────────────────────────────────

const CUSTOMER_INFO_KEY = "steward_customer_info";
const ORDER_HISTORY_KEY  = "steward_order_history";

interface StoredCustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

interface StoredOrder {
  id: string;
  orderNumber: string;
  slug: string;
  placedAt: string;
  total: number;
}

function readCustomerInfo(): StoredCustomerInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CUSTOMER_INFO_KEY);
    if (raw) return JSON.parse(raw) as StoredCustomerInfo;
    // Fallback: read from cookie
    const match = document.cookie
      .split("; ")
      .find((r) => r.startsWith(`${CUSTOMER_INFO_KEY}=`));
    if (match) return JSON.parse(decodeURIComponent(match.split("=")[1]));
  } catch { /* ignore */ }
  return null;
}

function saveCustomerInfo(info: StoredCustomerInfo): void {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(info);
    localStorage.setItem(CUSTOMER_INFO_KEY, json);
    // Also write a 90-day cookie so it persists across sessions even if localStorage is cleared
    document.cookie = `${CUSTOMER_INFO_KEY}=${encodeURIComponent(json)}; max-age=${60 * 60 * 24 * 90}; path=/; SameSite=Lax`;
  } catch { /* ignore */ }
}

function saveOrderToHistory(order: StoredOrder): void {
  if (typeof window === "undefined") return;
  try {
    const existing: StoredOrder[] = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) ?? "[]");
    // Keep newest first, cap at 20 entries
    const updated = [order, ...existing.filter((o) => o.id !== order.id)].slice(0, 20);
    const json = JSON.stringify(updated);
    localStorage.setItem(ORDER_HISTORY_KEY, json);
    // Short-lived cookie so my-orders page can read it cross-tab
    document.cookie = `${ORDER_HISTORY_KEY}=${encodeURIComponent(json)}; max-age=${60 * 60 * 24 * 7}; path=/; SameSite=Lax`;
  } catch { /* ignore */ }
}

// ── Field component ───────────────────────────────────────────────────────────

function Field(props: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium tracking-[0.14em] uppercase text-[rgba(var(--on-surface-rgb),0.50)]">
        {props.label}
      </label>
      {props.children}
      {props.error && (
        <p className="text-[11px] text-[#F87171]">{props.error}</p>
      )}
    </div>
  );
}

const inputCls = cn(
  "w-full rounded-2xl border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)]",
  "px-5 py-3.5 text-sm text-foreground placeholder:text-[rgba(var(--on-surface-rgb),0.35)]",
  "focus:outline-none focus:ring-1 focus:ring-[rgba(var(--on-surface-rgb),0.22)] focus:border-[rgba(var(--on-surface-rgb),0.22)]",
  "transition-all"
);

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const cartHref   = `/menu/${slug}/cart`;
  const trackingBase = `/menu/${slug}/tracking`;

  // Prevent SSR hydration mismatch — show loader until client cart is ready
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [copiedId, setCopiedId] = useState<"upiId" | "upiRef" | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent));
    }
  }, []);
  const [createdUpiOrder, setCreatedUpiOrder] = useState<OrderResponse | null>(null);
  const { openRazorpay } = useRazorpay(paymentMethod === "online");

  const items        = useCartStore((s) => s.items);
  const subtotal     = useCartStore((s) => s.subtotal);
  const tax          = useCartStore((s) => s.tax);
  const total        = useCartStore((s) => s.total);
  const clearCart    = useCartStore((s) => s.clearCart);
  const taxRate      = useCartStore((s) => s.taxRate);
  const createOrderMutation = useCreateOrder(slug);
  const { offlineMode } = useRestaurant();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName:  "",
      customerPhone: "",
      customerEmail: "",
      orderType: "TAKEAWAY",
    },
  });

  const diningOption = useWatch({ control, name: "orderType" });

  // Pre-fill customer info from cookies/localStorage
  useEffect(() => {
    const saved = readCustomerInfo();
    if (saved) {
      reset({
        customerName:  saved.name,
        customerPhone: saved.phone,
        customerEmail: saved.email ?? "",
        orderType: "TAKEAWAY",
      });
    }
  }, [reset]);

  const handleOrderTypeChange = useCallback(
    (option: "TAKEAWAY" | "COUNTER_PICKUP") => {
      setValue("orderType", option, { shouldDirty: true, shouldValidate: true });
    },
    [setValue]
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <main className="min-h-screen pb-24 bg-[var(--surface-raised)]">
        <header className="sticky top-0 z-40 bg-[var(--surface-raised)]/85 backdrop-blur-xl border-b border-[rgba(var(--on-surface-rgb),0.08)]">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center gap-3">
            <Link
              href={cartHref}
              className="grid h-10 w-10 place-items-center rounded-full border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)]"
              aria-label="Back to cart"
            >
              <ArrowLeft className="h-4 w-4 text-[rgba(var(--on-surface-rgb),0.70)]" />
            </Link>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Checkout</h1>
          </div>
        </header>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[rgba(var(--on-surface-rgb),0.45)]" />
        </div>
      </main>
    );
  }

  // ── Offline ───────────────────────────────────────────────────────────────

  if (offlineMode) {
    return (
      <main className="min-h-screen bg-[var(--surface-raised)] flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Checkout Unavailable</h1>
          <p className="text-[rgba(var(--on-surface-rgb),0.60)]">
            Online ordering is currently turned off. Please try again later.
          </p>
          <Link href={`/menu/${slug}`} className="inline-block mt-4 text-[13px] font-medium text-foreground underline underline-offset-4">
            Return to Menu
          </Link>
        </div>
      </main>
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: CheckoutFormValues) => {
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    // Persist customer info for next visit
    saveCustomerInfo({
      name:  values.customerName || "",
      phone: values.customerPhone || "",
      email: values.customerEmail || undefined,
    });

    try {
      const payload: CreateOrderPayload = {
        orderType: values.orderType as OrderType,
        // Coerce empty strings → undefined so the backend never receives an
        // empty string in an optional field and rejects it as "required".
        customerName:  values.customerName  || undefined,
        customerPhone: values.customerPhone || undefined,
        customerEmail: values.customerEmail || undefined,
        items: items.map((ci) => ({
          menuItemId: ci.menuItemId,
          quantity:   ci.quantity,
          notes:      ci.notes,
        })),
        paymentMethod,
      };

      const newOrder = await createOrderMutation.mutateAsync(payload);

      // Persist order to history (cookies + localStorage)
      saveOrderToHistory({
        id:          newOrder.id,
        orderNumber: newOrder.orderNumber,
        slug,
        placedAt:    new Date().toISOString(),
        total:       total(),
      });

      if (paymentMethod === "online") {
        try {
          const { data: rzpData } = await api.post("/payment/create-order", {
            stewardOrderId: newOrder.id,
          });
          const { razorpayPaymentId, razorpayOrderId, razorpaySignature } =
            await openRazorpay({
              key:      rzpData.data.keyId,
              amount:   rzpData.data.amount,
              currency: rzpData.data.currency,
              name:     "Steward",
              orderId:  rzpData.data.razorpayOrderId,
              prefill: {
                name:    values.customerName,
                contact: values.customerPhone,
                email:   values.customerEmail || undefined,
              },
            });
          await api.post("/payment/verify", {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            stewardOrderId: newOrder.id,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.message === "Payment cancelled by user") {
            toast.error("Payment cancelled. Your order has been placed but not paid.");
          } else {
            toast.error("Payment failed. Please try again or pay at the counter.");
          }
          clearCart();
          router.push(`${trackingBase}?id=${newOrder.id}`);
          return;
        }
      }

      clearCart();
      // Steward Verify infrastructure retained for future use.
      // Currently inactive in production while Razorpay is the primary payment provider.
      if (paymentMethod === "upi_qr") {
        setCreatedUpiOrder(newOrder);
      } else {
        router.push(`${trackingBase}?id=${newOrder.id}`);
      }
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  const handleCloseUpiDialog = () => {
    if (createdUpiOrder) {
      router.push(`${trackingBase}?id=${createdUpiOrder.id}`);
      setCreatedUpiOrder(null);
    }
  };



  const handleCopy = (text: string, id: "upiId" | "upiRef", label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const isUpiValid = !!(
    createdUpiOrder &&
    createdUpiOrder.upiId &&
    createdUpiOrder.upiId.includes("@") &&
    createdUpiOrder.paymentAmount &&
    !isNaN(Number(createdUpiOrder.paymentAmount)) &&
    createdUpiOrder.upiRef
  );

  const upiUri = isUpiValid && createdUpiOrder
    ? `upi://pay?pa=${encodeURIComponent(createdUpiOrder.upiId!)}&am=${encodeURIComponent(createdUpiOrder.paymentAmount!)}&tn=${encodeURIComponent(createdUpiOrder.upiRef!)}`
    : "";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen pb-24 bg-[var(--surface-raised)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--surface-raised)]/85 backdrop-blur-xl border-b border-[rgba(var(--on-surface-rgb),0.08)]">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            href={cartHref}
            className="grid h-10 w-10 place-items-center rounded-full border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)] hover:bg-[rgba(var(--on-surface-rgb),0.12)] transition-colors"
            aria-label="Back to cart"
          >
            <ArrowLeft className="h-4 w-4 text-[rgba(var(--on-surface-rgb),0.70)]" />
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Checkout</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Customer Details */}
          <section className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-6 shadow-[0_18px_50px_rgba(var(--on-surface-rgb),0.08)]">
            <h2 className="text-[11px] font-medium tracking-[0.18em] uppercase text-[rgba(var(--on-surface-rgb),0.50)]">
              Your Details
            </h2>
            <div className="mt-5 space-y-5">
              <Field label="Name" error={errors.customerName?.message}>
                <input
                  type="text"
                  placeholder="Your name"
                  {...register("customerName")}
                  className={inputCls}
                />
              </Field>

              <Field label="Phone" error={errors.customerPhone?.message}>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  {...register("customerPhone")}
                  className={inputCls}
                />
              </Field>

              <Field label="Email (optional)" error={errors.customerEmail?.message}>
                <input
                  type="email"
                  placeholder="name@email.com"
                  {...register("customerEmail")}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          {/* Dining Option */}
          <section className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-6 shadow-[0_18px_50px_rgba(var(--on-surface-rgb),0.08)]">
            <h2 className="text-[11px] font-medium tracking-[0.18em] uppercase text-[rgba(var(--on-surface-rgb),0.50)]">
              Dining Option
            </h2>
            {/* Hidden field so react-hook-form tracks the value */}
            <input type="hidden" {...register("orderType")} />
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(["TAKEAWAY", "COUNTER_PICKUP"] as const).map((option) => {
                const active = diningOption === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOrderTypeChange(option)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.97] active:duration-75",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(var(--on-surface-rgb),0.22)]",
                      active
                        ? "border-[rgba(var(--on-surface-rgb),0.20)] bg-[rgba(var(--on-surface-rgb),0.10)] shadow-[inset_0_1px_0_rgba(var(--on-surface-rgb),0.06)]"
                        : "border-[rgba(var(--on-surface-rgb),0.08)] bg-transparent hover:bg-[rgba(var(--on-surface-rgb),0.05)]"
                    )}
                  >
                    <div className={cn("text-sm font-semibold tracking-tight", active ? "text-foreground" : "text-[rgba(var(--on-surface-rgb),0.55)]")}>
                      {option === "TAKEAWAY" ? "🛍 Takeaway" : "🪧 Collect at Counter"}
                    </div>
                    <div className="mt-1 text-xs text-[rgba(var(--on-surface-rgb),0.40)]">
                      {option === "TAKEAWAY" ? "Packed and ready to go." : "Order now, pick up when ready."}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Order Summary */}
          <section className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-6 shadow-[0_18px_50px_rgba(var(--on-surface-rgb),0.08)]">
            <h2 className="text-[11px] font-medium tracking-[0.18em] uppercase text-[rgba(var(--on-surface-rgb),0.50)]">
              Summary
            </h2>
            {items.length === 0 ? (
              <p className="mt-4 text-sm text-[rgba(var(--on-surface-rgb),0.45)]">Your cart is empty.</p>
            ) : (
              <>
                <div className="mt-5 space-y-2.5 text-sm">
                  {items.map((ci) => (
                    <div key={ci.menuItemId} className="flex justify-between gap-3">
                      <div className="min-w-0 text-[rgba(var(--on-surface-rgb),0.65)] truncate">
                        {ci.name}{" "}
                        <span className="text-foreground font-medium tabular-nums">× {ci.quantity}</span>
                      </div>
                      <div className="font-medium tabular-nums text-foreground">
                        ₹{ci.price * ci.quantity}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-[rgba(var(--on-surface-rgb),0.08)] space-y-2 text-sm">
                  <div className="flex justify-between text-[rgba(var(--on-surface-rgb),0.55)]">
                    <span>Subtotal</span>
                    <span className="font-medium tabular-nums text-foreground">₹{subtotal()}</span>
                  </div>
                  <div className="flex justify-between text-[rgba(var(--on-surface-rgb),0.55)]">
                    <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                    <span className="font-medium tabular-nums text-foreground">₹{tax()}</span>
                  </div>
                  <div className="pt-3 border-t border-[rgba(var(--on-surface-rgb),0.08)] flex justify-between items-baseline">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="text-xl font-bold tabular-nums text-foreground">₹{total()}</span>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Payment Method */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-medium tracking-[0.14em] uppercase text-[rgba(var(--on-surface-rgb),0.50)]">
              Payment Method
            </h3>
            <div className="grid gap-2">
              {([
                { value: "cash",    label: "Pay at Counter",  sub: "Cash or UPI at the counter.",         Icon: Wallet },
                // Steward Verify infrastructure retained for future use.
                // Currently inactive in production while Razorpay is the primary payment provider.
                { value: "upi_qr", label: "Scan & Pay (UPI)", sub: "Scan the QR shown after placing order.", Icon: QrCode },
                { value: "online", label: "Pay Online",        sub: "Secure card/UPI via Razorpay.",        Icon: CreditCard },
              ] as const).filter(item => item.value !== "upi_qr").map(({ value, label, sub, Icon }) => {
                const active = paymentMethod === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.97] active:duration-75",
                      active
                        ? "border-[rgba(var(--on-surface-rgb),0.20)] bg-[rgba(var(--on-surface-rgb),0.10)] shadow-[inset_0_1px_0_rgba(var(--on-surface-rgb),0.06)]"
                        : "border-[rgba(var(--on-surface-rgb),0.08)] bg-transparent hover:bg-[rgba(var(--on-surface-rgb),0.05)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="text-left">
                        <div className={cn("text-sm font-semibold tracking-tight", active ? "text-foreground" : "text-[rgba(var(--on-surface-rgb),0.55)]")}>
                          {label}
                        </div>
                        <div className="text-xs text-[rgba(var(--on-surface-rgb),0.40)] mt-0.5">{sub}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={createOrderMutation.isPending || items.length === 0}
            className={cn(
              "w-full rounded-full px-6 py-4 text-sm font-semibold tracking-tight",
              "bg-[rgba(var(--on-surface-rgb),0.92)] text-[var(--surface-raised)]",
              "shadow-[0_22px_60px_rgba(var(--on-surface-rgb),0.18)]",
              "hover:bg-[rgba(var(--on-surface-rgb),0.86)] transition-all active:scale-[0.98] active:duration-75",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
            style={{ boxShadow: "0 0 0 1.5px var(--brand-color, transparent) inset" }}
          >
            {createOrderMutation.isPending
              ? "Placing order…"
              : items.length === 0
              ? "Cart is empty"
              : `Place order · ₹${total()}`}
          </button>
        </form>
      </div>

      {createdUpiOrder && (
        <Dialog open={!!createdUpiOrder} onOpenChange={(open) => { if (!open) handleCloseUpiDialog(); }}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-[var(--surface-raised)]/95 border border-[rgba(var(--on-surface-rgb),0.1)] text-foreground rounded-3xl p-6 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.7)]" showCloseButton={false}>
            <DialogHeader className="text-center space-y-2">
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5 text-foreground animate-pulse" />
                Scan & Pay via UPI
              </DialogTitle>
              <DialogDescription className="text-xs text-[rgba(var(--on-surface-rgb),0.55)]">
                Scan the QR code below using any UPI app (GPay, PhonePe, Paytm) to complete your payment.
              </DialogDescription>
            </DialogHeader>

            {isUpiValid ? (
              <div className="space-y-5 py-3">
                {/* QR Code container with white background to allow scanning on dark themes */}
                <div className="bg-white p-5 rounded-2xl mx-auto flex items-center justify-center w-52 h-52 shadow-md transition-transform duration-300 hover:scale-[1.02] border border-[rgba(var(--on-surface-rgb),0.1)]">
                  <QRCodeSVG
                    value={upiUri}
                    size={170}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                {/* Amount Display */}
                <div className="text-center space-y-1 py-1">
                  <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-[rgba(var(--on-surface-rgb),0.45)]">
                    Pay Exact Amount
                  </span>
                  <div className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums flex items-baseline justify-center gap-0.5">
                    <span className="text-xl font-bold">₹</span>
                    {createdUpiOrder.paymentAmount ?? ""}
                  </div>
                </div>

                {/* Details Table */}
                <div className="rounded-2xl border border-[rgba(var(--on-surface-rgb),0.06)] bg-[rgba(var(--on-surface-rgb),0.02)] p-4 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[rgba(var(--on-surface-rgb),0.5)] shrink-0">UPI ID</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-foreground select-all truncate">{createdUpiOrder.upiId ?? ""}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdUpiOrder.upiId ?? "", "upiId", "UPI ID")}
                        className="p-1 hover:bg-[rgba(var(--on-surface-rgb),0.08)] rounded-lg transition-colors text-[rgba(var(--on-surface-rgb),0.55)] hover:text-foreground shrink-0 focus:outline-none"
                        aria-label="Copy UPI ID"
                      >
                        {copiedId === "upiId" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[rgba(var(--on-surface-rgb),0.5)] shrink-0">Reference ID</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-foreground select-all tabular-nums truncate">{createdUpiOrder.upiRef ?? ""}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdUpiOrder.upiRef ?? "", "upiRef", "Reference ID")}
                        className="p-1 hover:bg-[rgba(var(--on-surface-rgb),0.08)] rounded-lg transition-colors text-[rgba(var(--on-surface-rgb),0.55)] hover:text-foreground shrink-0 focus:outline-none"
                        aria-label="Copy Reference ID"
                      >
                        {copiedId === "upiRef" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* User Instructions */}
                <div className="rounded-2xl border border-[rgba(var(--on-surface-rgb),0.06)] bg-[rgba(var(--on-surface-rgb),0.02)] p-4 text-xs text-[rgba(var(--on-surface-rgb),0.6)]">
                  <h4 className="font-semibold text-foreground mb-2 uppercase tracking-wider text-[10px] text-left">Instructions</h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-left pl-1">
                    <li>Scan the QR code or open a UPI app</li>
                    <li>Pay the exact amount of <strong className="text-foreground font-semibold">₹{createdUpiOrder.paymentAmount ?? ""}</strong></li>
                    <li>Use reference <strong className="text-foreground font-semibold select-all">{createdUpiOrder.upiRef ?? ""}</strong> if required</li>
                    <li>After paying, tap below to track order</li>
                  </ol>
                </div>

                {/* Open UPI App link button */}
                {isMobile && (
                  <a
                    href={upiUri}
                    className="flex items-center justify-center gap-2 w-full rounded-full border border-[rgba(var(--on-surface-rgb),0.15)] bg-transparent py-3.5 text-sm font-semibold tracking-tight text-foreground hover:bg-[rgba(var(--on-surface-rgb),0.05)] transition-all active:scale-[0.98] focus:outline-none"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open UPI App
                  </a>
                )}
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center mx-auto text-destructive">
                  ⚠️
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Payment Details Unavailable</p>
                  <p className="text-xs text-[rgba(var(--on-surface-rgb),0.55)] px-4">
                    UPI payment details could not be generated or are malformed. Please pay at the counter.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="sm:justify-center border-t-0 p-0 mt-2 bg-transparent -mx-0 -mb-0">
              <button
                type="button"
                onClick={handleCloseUpiDialog}
                className="w-full rounded-full bg-foreground text-background py-3.5 text-sm font-semibold tracking-tight shadow-[0_12px_30px_rgba(var(--on-surface-rgb),0.15)] hover:bg-[rgba(var(--on-surface-rgb),0.9)] transition-all active:scale-[0.98]"
              >
                {isUpiValid ? "I have paid, track order" : "Track Order"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
