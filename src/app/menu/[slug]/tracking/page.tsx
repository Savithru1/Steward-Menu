"use client";

import Link from "next/link";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Wifi, WifiOff, CreditCard, QrCode, Copy, Check, ExternalLink } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { usePaymentSdk } from "@/hooks/usePaymentSdk";
import { QRCodeSVG } from "qrcode.react";

import { ProgressTimeline } from "@/components/tracking/ProgressTimeline";
import { CancelOrderButton } from "@/components/tracking/CancelOrderButton";
import { useOrderTracking } from "@/hooks/useOrder";
import { getSocket } from "@/lib/sockets";
import type { OrderStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type TrackingStatus = "placed" | "preparing" | "ready";

function toTrackingStatus(status: OrderStatus): TrackingStatus {
  switch (status) {
    case "NEW":       return "placed";
    case "PREPARING": return "preparing";
    case "READY":     return "ready";
    // Terminal states — show last meaningful state
    case "COMPLETED": return "ready";
    case "CANCELLED": return "placed";
    default:          return "placed";
  }
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      title={connected ? "Live updates" : "Reconnecting…"}
      className="flex items-center gap-1 text-[11px] text-[rgba(var(--on-surface-rgb),0.45)]"
    >
      {connected ? (
        <>
          <Wifi className="h-3 w-3 text-emerald-600" />
          <span className="font-semibold text-emerald-700">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-amber-500" />
          <span>Polling</span>
        </>
      )}
    </span>
  );
}

function TrackingContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("id");
  const menuHref = `/menu/${slug}`;

  const [socketConnected, setSocketConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    const frame = window.requestAnimationFrame(() => {
      setSocketConnected(socket.connected);
    });
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      window.cancelAnimationFrame(frame);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // Poll every 15s as fallback when socket isn't available
  const { data: order, isLoading, isError } = useOrderTracking(orderId, slug, {
    refetchInterval: 15_000,
  });

  const [showUpiDialog, setShowUpiDialog] = useState(false);
  const [copiedId, setCopiedId] = useState<"upiId" | "upiRef" | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent));
    }
  }, []);

  useEffect(() => {
    if (order?.paymentStatus === "paid") {
      setShowUpiDialog(false);
    }
  }, [order?.paymentStatus]);

  const handleCopy = (text: string, id: "upiId" | "upiRef", label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const isUpiValid = !!(
    order &&
    order.upiId &&
    order.upiId.includes("@") &&
    order.paymentAmount &&
    !isNaN(Number(order.paymentAmount)) &&
    order.upiRef
  );

  const upiUri = isUpiValid && order
    ? `upi://pay?pa=${encodeURIComponent(order.upiId!)}&am=${encodeURIComponent(order.paymentAmount!)}&tn=${encodeURIComponent(order.upiRef!)}`
    : "";

  const { executeSdk } = usePaymentSdk();

  const isCompleted = order?.status === "COMPLETED";

  const verifyPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/payment/verify", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Payment successful!");
    },
    onError: () => {
      toast.error("Payment verification failed.");
    },
  });

  const handlePayOnline = async () => {
    if (!order?.id) {
      toast.error("Order details not found. Please speak to staff.");
      return;
    }
    
    try {
      const { data: resData } = await api.post("/payment/session", {
        stewardOrderId: order.id,
      });
      const session = resData.data;

      if (session.executionStrategy === 'redirect' && session.executionPayload?.url) {
        window.location.href = session.executionPayload.url;
        return;
      } else if (session.executionStrategy === 'native_sdk' && session.executionPayload?.sdkManifest) {
        const verificationData = await executeSdk(session.executionPayload.sdkManifest);
        verifyPaymentMutation.mutate({
          ...verificationData,
          stewardOrderId: order.id,
        });
      } else {
        throw new Error("Unsupported payment execution strategy");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message !== "Payment cancelled by user") {
        toast.error("Payment failed. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (!isCompleted) return;

    const timer = setTimeout(() => {
      router.push(menuHref);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isCompleted, router, menuHref]);

  if (isLoading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-[rgba(var(--on-surface-rgb),0.72)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading order…</span>
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="min-h-screen grid place-items-center px-4 bg-[var(--surface-raised)]">
        <div className="w-full max-w-md rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-8 text-center shadow-[0_18px_50px_rgba(var(--on-surface-rgb),0.10)]">
          <div className="text-sm font-semibold text-[#B42318]">
            Failed to load order
          </div>
          <p className="mt-2 text-sm text-[rgba(var(--on-surface-rgb),0.72)]">
            Please return to the menu and try again.
          </p>
          <Link href={menuHref} className="inline-flex mt-6">
            <button className="rounded-full px-6 py-3 text-xs font-semibold tracking-tight bg-[rgba(var(--on-surface-rgb),0.92)] text-[var(--surface-raised)] hover:bg-[rgba(var(--on-surface-rgb),0.86)] transition-colors">
              Back to menu
            </button>
          </Link>
        </div>
      </main>
    );
  }

  const trackingStatus = toTrackingStatus(order.status);
  const isCancelled = order.status === "CANCELLED";
  return (
    <main className="min-h-screen pb-24 bg-[var(--surface-raised)]">
      <header className="sticky top-0 z-40 bg-[var(--surface-raised)]/85 backdrop-blur-xl border-b border-[rgba(var(--on-surface-rgb),0.08)]">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={menuHref}
              className="grid h-10 w-10 place-items-center rounded-full border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)] hover:bg-[rgba(var(--on-surface-rgb),0.12)] transition-colors"
              aria-label="Back to menu"
            >
              <ArrowLeft className="h-4 w-4 text-[rgba(var(--on-surface-rgb),0.70)]" />
            </Link>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Order status
            </h1>
          </div>
          <ConnectionDot connected={socketConnected} />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-6">
        <section className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-6 shadow-[0_18px_50px_rgba(var(--on-surface-rgb),0.10)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-[rgba(var(--on-surface-rgb),0.50)]">
                Order
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {order.orderNumber}
              </div>
            </div>
            {!isCancelled && !isCompleted && order.paymentStatus !== "failed" && (
              <div className="text-right">
                <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-[rgba(var(--on-surface-rgb),0.50)]">
                  ETA
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  ~{order.estimatedMins} min
                </div>
              </div>
            )}
          </div>

          {order.status === "NEW" && order.paymentStatus !== "failed" && (
            <div className="mt-4">
              <CancelOrderButton
                orderId={order.id}
                status={order.status}
                placedAt={order.createdAt}
              />
            </div>
          )}

          {/* Cancelled banner */}
          {isCancelled && (
            <div className="mt-4 rounded-2xl bg-[#B42318]/8 border border-[#B42318]/15 px-4 py-3">
              <p className="text-sm font-semibold text-[#B42318]">Order cancelled</p>
              <p className="text-xs text-[rgba(var(--on-surface-rgb),0.60)] mt-0.5">
                If you have questions, please speak to staff.
              </p>
            </div>
          )}

          {/* Completed banner */}
          {isCompleted && (
            <div className="mt-4 rounded-2xl bg-[rgba(var(--on-surface-rgb),0.04)] border border-[rgba(var(--on-surface-rgb),0.08)] px-4 py-3">
              <p className="text-sm font-semibold text-[rgba(var(--on-surface-rgb),0.72)]">Order completed</p>
              <p className="text-xs text-[rgba(var(--on-surface-rgb),0.50)] mt-0.5">
                Thank you — enjoy your meal!
              </p>
            </div>
          )}

          {/* Payment Expired Banner / Card */}
          {!isCancelled && order.paymentStatus === "failed" && (
            <div className="mt-4 rounded-2xl bg-[#B42318]/8 border border-[#B42318]/15 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#B42318]/10">
                  <span className="text-lg">⚠️</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#B42318]">Payment Expired</h3>
                  <p className="text-xs text-[rgba(var(--on-surface-rgb),0.60)] mt-0.5">
                    Your payment window has expired. The order was not processed.
                  </p>
                </div>
              </div>
              <Link href={menuHref} className="block mt-4">
                <button className="w-full rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-[rgba(var(--on-surface-rgb),0.9)] transition-colors">
                  Place New Order
                </button>
              </Link>
            </div>
          )}

          {/* Payment Recovery Card */}
          {!isCancelled && order.paymentStatus !== "failed" && order.paymentMethod === "online" && order.paymentStatus !== "paid" && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/10">
                  <CreditCard className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-500">Online Payment Pending</h3>
                  <p className="text-xs text-[rgba(var(--on-surface-rgb),0.60)] mt-0.5">
                    Your payment of ₹{order.totalAmount} is not completed.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePayOnline}
                disabled={verifyPaymentMutation.isPending}
                className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {verifyPaymentMutation.isPending ? "Verifying..." : "Pay Now Online"}
              </button>
            </div>
          )}
          
          {/* Payment Success Card */}
          {!isCancelled && order.paymentStatus !== "failed" && order.paymentMethod === "online" && order.paymentStatus === "paid" && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/10">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-500">Payment Successful</h3>
                  <p className="text-xs text-[rgba(var(--on-surface-rgb),0.60)] mt-0.5">
                    ₹{order.totalAmount} paid online.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* UPI QR Payment Pending Card */}
          {/* Steward Verify infrastructure retained for future use. */}
          {/* Currently inactive in production while Razorpay is the primary payment provider. */}
          {false && !isCancelled && order?.paymentStatus !== "failed" && order?.paymentMethod === "upi_qr" && order?.paymentStatus === "pending" && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/10">
                  <QrCode className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-amber-500">Awaiting Payment</h3>
                  <p className="text-xs text-[rgba(var(--on-surface-rgb),0.60)] mt-0.5">
                    Pay exactly <strong className="text-foreground font-semibold">₹{order?.paymentAmount}</strong> with reference <strong className="text-foreground font-semibold select-all tabular-nums">{order?.upiRef}</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUpiDialog(true)}
                className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors"
              >
                Show QR Code & Pay
              </button>
            </div>
          )}

          {/* UPI QR Payment Verified Card */}
          {/* Steward Verify infrastructure retained for future use. */}
          {/* Currently inactive in production while Razorpay is the primary payment provider. */}
          {false && !isCancelled && order?.paymentStatus !== "failed" && order?.paymentMethod === "upi_qr" && order?.paymentStatus === "paid" && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/10">
                  <QrCode className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-500">Payment Verified ✓</h3>
                  <p className="text-xs text-[rgba(var(--on-surface-rgb),0.60)] mt-0.5">
                    ₹{order?.paymentAmount ?? order?.totalAmount} verified via UPI.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Steward Verify infrastructure retained for future use. */}
          {/* Currently inactive in production while Razorpay is the primary payment provider. */}
          {false && !isCancelled && order?.paymentStatus !== "failed" && order?.paymentMethod === "upi_qr" && order?.paymentStatus === "pending" ? (
            <div className="mt-6 rounded-2xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] p-5 text-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-[rgba(var(--on-surface-rgb),0.45)] mb-3" />
              <p className="text-sm font-medium text-[rgba(var(--on-surface-rgb),0.70)]">
                Waiting for payment verification
              </p>
              <p className="text-xs text-[rgba(var(--on-surface-rgb),0.45)] mt-1">
                Your order preparation will begin once payment is confirmed.
              </p>
            </div>
          ) : !isCancelled && order?.paymentStatus !== "failed" ? (
            <div className="mt-6 rounded-2xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] p-5">
              <ProgressTimeline currentStatus={trackingStatus} />
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[rgba(var(--on-surface-rgb),0.08)] bg-[rgba(var(--on-surface-rgb),0.04)] backdrop-blur-xl p-6 shadow-[0_18px_50px_rgba(var(--on-surface-rgb),0.10)]">
          <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-[rgba(var(--on-surface-rgb),0.50)]">
            Items
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {order.items.map((it, idx) => (
              <div key={idx} className="flex justify-between gap-3">
                <div className="min-w-0 text-[rgba(var(--on-surface-rgb),0.72)] truncate">
                  <span className="font-medium text-foreground tabular-nums">
                    {it.quantity}×
                  </span>{" "}
                  {it.name}
                </div>
                <div className="font-medium tabular-nums text-foreground">
                  ₹{Number(it.price) * it.quantity}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[rgba(var(--on-surface-rgb),0.08)] flex justify-between items-baseline">
            <span className="text-[rgba(var(--on-surface-rgb),0.72)]">Total</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              ₹{order.totalAmount}
            </span>
          </div>
        </section>

        <Link href={menuHref}>
          <button className="w-full rounded-full px-6 py-3.5 text-sm font-semibold tracking-tight border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)] hover:bg-[rgba(var(--on-surface-rgb),0.12)] transition-colors">
            Back to menu
          </button>
        </Link>
      </div>

      {showUpiDialog && order && (
        <Dialog open={showUpiDialog} onOpenChange={(open) => setShowUpiDialog(open)}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-[var(--surface-raised)]/95 border border-[rgba(var(--on-surface-rgb),0.1)] text-foreground rounded-3xl p-6 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.7)]" showCloseButton={true}>
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
                    {order.paymentAmount ?? ""}
                  </div>
                </div>

                {/* Details Table */}
                <div className="rounded-2xl border border-[rgba(var(--on-surface-rgb),0.06)] bg-[rgba(var(--on-surface-rgb),0.02)] p-4 space-y-3.5 text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[rgba(var(--on-surface-rgb),0.5)] shrink-0">UPI ID</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-foreground select-all truncate">{order.upiId ?? ""}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(order.upiId ?? "", "upiId", "UPI ID")}
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
                      <span className="font-semibold text-foreground select-all tabular-nums truncate">{order.upiRef ?? ""}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(order.upiRef ?? "", "upiRef", "Reference ID")}
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
                    <li>Pay the exact amount of <strong className="text-foreground font-semibold">₹{order.paymentAmount ?? ""}</strong></li>
                    <li>Use reference <strong className="text-foreground font-semibold select-all">{order.upiRef ?? ""}</strong> if required</li>
                    <li>Once payment is matched, this page updates automatically</li>
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
                onClick={() => setShowUpiDialog(false)}
                className="w-full rounded-full bg-foreground text-background py-3.5 text-sm font-semibold tracking-tight shadow-[0_12px_30px_rgba(var(--on-surface-rgb),0.15)] hover:bg-[rgba(var(--on-surface-rgb),0.9)] transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}

function TrackingFallback() {
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="flex items-center gap-3 text-[rgba(var(--on-surface-rgb),0.72)]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading order…</span>
      </div>
    </main>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<TrackingFallback />}>
      <TrackingContent />
    </Suspense>
  );
}
