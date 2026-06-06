"use client";

import { useEffect, useState, useCallback } from "react";

export const CONSENT_KEY = "steward_cookie_consent";
export type ConsentValue = "accepted" | "declined" | null;

export function getConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(CONSENT_KEY) as ConsentValue) ?? null;
}

interface CookieConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const existing = localStorage.getItem(CONSENT_KEY);
      if (!existing) setVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleAccept = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
    onAccept();
  }, [onAccept]);

  const handleDecline = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
    onDecline();
  }, [onDecline]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-6 pointer-events-none">
      <div className="mx-auto max-w-2xl pointer-events-auto">
        <div className="rounded-3xl border border-[rgba(27,18,13,0.12)] bg-[#F1E7B8]/95 backdrop-blur-xl shadow-[0_24px_64px_rgba(27,18,13,0.18)] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="flex-1 text-[13px] text-[rgba(27,18,13,0.75)] leading-relaxed">
            We save a cookie so you can view your past orders.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDecline}
              className="rounded-full px-4 py-2 text-[12px] font-semibold border border-[rgba(27,18,13,0.14)] bg-[rgba(255,255,255,0.30)] text-[rgba(27,18,13,0.65)] hover:bg-[rgba(255,255,255,0.50)] transition-colors"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="rounded-full px-4 py-2 text-[12px] font-semibold bg-[rgba(27,18,13,0.92)] text-[#F1E7B8] hover:bg-[rgba(27,18,13,0.82)] transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
