import { useEffect } from "react";

declare global {
  interface Window {
    Razorpay: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      const handleLoad = () => resolve(true);
      const handleError = () => resolve(false);
      existing.addEventListener("load", handleLoad, { once: true });
      existing.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function useRazorpay(shouldLoad = false) {
  useEffect(() => {
    if (!shouldLoad) return;
    loadScript(RAZORPAY_SCRIPT);
  }, [shouldLoad]);

  const openRazorpay = (options: {
    key: string;
    amount: number;
    currency: string;
    name: string;
    orderId: string;
    prefill?: { name?: string; contact?: string; email?: string };
  }): Promise<{ razorpayPaymentId: string; razorpayOrderId: string; razorpaySignature: string }> => {
    return new Promise(async (resolve, reject) => {
      try {
        const isLoaded = await loadScript(RAZORPAY_SCRIPT);
        if (!isLoaded || !window.Razorpay) {
          reject(new Error("Failed to load Razorpay SDK. Please check your internet connection."));
          return;
        }

        const rzp = new window.Razorpay({
          ...options,
          order_id: options.orderId,
          handler(response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
            resolve({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss() {
              reject(new Error("Payment cancelled by user"));
            },
          },
        });
        rzp.open();
      } catch (err) {
        reject(err);
      }
    });
  };

  return { openRazorpay };
}
