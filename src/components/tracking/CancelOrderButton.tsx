"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { useCancelGuestOrder } from "@/hooks/useOrder";
import type { OrderStatus } from "@/types";
import type { AxiosError } from "axios";
import { cn } from "@/lib/utils";

interface CancelOrderButtonProps {
  orderId: string;
  status: OrderStatus;
  placedAt?: string;        // ISO timestamp of order.createdAt
  onCancelled?: () => void;
}

/**
 * CancelOrderButton — shown on the order tracking page.
 * Only renders when status === "NEW" (kitchen hasn't started yet).
 * Shows a confirmation dialog before calling the API.
 * Uses optimistic UI: immediately shows "Cancelled" then reverts on error.
 */
export function CancelOrderButton({ orderId, status, placedAt, onCancelled }: CancelOrderButtonProps) {
  const { slug } = useParams<{ slug: string }>();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(() => {
    if (!placedAt) return false;
    const secondsElapsed = (Date.now() - new Date(placedAt).getTime()) / 1000;
    return secondsElapsed < 60;
  });

  const { mutate: cancelOrder, isPending } = useCancelGuestOrder(orderId, slug);

  useEffect(() => {
    if (!placedAt) return;
    const secondsElapsed = (Date.now() - new Date(placedAt).getTime()) / 1000;
    if (secondsElapsed >= 60) {
      return;
    }
    const remaining = Math.ceil((60 - secondsElapsed) * 1000);
    const t = setTimeout(() => setIsUrgent(false), remaining);
    return () => clearTimeout(t);
  }, [placedAt]);

  // Only render for NEW orders
  if (status !== "NEW") return null;

  const handleConfirm = () => {
    setError(null);
    cancelOrder(undefined, {
      onSuccess: () => {
        setConfirming(false);
        onCancelled?.();
      },
      onError: (err) => {
        const error = err as AxiosError<{ error?: { message?: string }; message?: string }>;
        const msg =
          error.response?.data?.error?.message ??
          error.message ??
          "Failed to cancel order. Please try again.";
        setError(msg);
      },
    });
  };

  if (confirming) {
    return (
      <div className="rounded-2xl border border-[#B42318]/15 bg-[#B42318]/6 p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#B42318]/12">
            <AlertTriangle className="h-3.5 w-3.5 text-[#B42318]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[rgba(var(--on-surface-rgb),0.82)]">
              Cancel this order?
            </p>
            <p className="text-[11px] text-[rgba(var(--on-surface-rgb),0.56)] mt-1">
              This cannot be undone. The kitchen will be notified immediately.
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-3 text-[11px] font-medium text-[#B42318] bg-[#B42318]/8 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold bg-[#B42318] text-white hover:bg-[#9a1c14] transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Yes, cancel order"
            )}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(null); }}
            disabled={isPending}
            className="rounded-full px-4 py-2 text-[12px] font-semibold border border-[rgba(var(--on-surface-rgb),0.10)] bg-[rgba(var(--on-surface-rgb),0.06)] hover:bg-[rgba(var(--on-surface-rgb),0.12)] transition-colors"
          >
            Keep order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setConfirming(true)}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium text-[rgba(var(--on-surface-rgb),0.70)] border border-[rgba(var(--on-surface-rgb),0.08)] transition-colors",
          isUrgent && status === "NEW"
            ? "bg-[#B42318]/[0.08] hover:bg-[#B42318]/[0.14] hover:text-[rgba(var(--on-surface-rgb),1)]"
            : "bg-[rgba(var(--on-surface-rgb),0.06)] hover:bg-[rgba(var(--on-surface-rgb),0.12)] hover:text-[rgba(var(--on-surface-rgb),1)]"
        )}
      >
        <X className="h-3.5 w-3.5" />
        Cancel order
      </button>
      {isUrgent && status === "NEW" && (
        <p className="text-[11px] font-medium text-[#B42318]">
          Cancel now — kitchen hasn&apos;t started yet
        </p>
      )}
    </div>
  );
}
