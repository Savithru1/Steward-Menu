"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CookieConsent, getConsent, ConsentValue, CONSENT_KEY } from "./CookieConsent";

interface ConsentContextValue {
  consent: ConsentValue;
  /** Call this to trigger the banner when consent hasn't been given yet. */
  requestConsent: (onAccept: () => void) => void;
}

const ConsentContext = createContext<ConsentContextValue>({
  consent: null,
  requestConsent: () => {},
});

export function useConsent() {
  return useContext(ConsentContext);
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [pendingAcceptCallback, setPendingAcceptCallback] = useState<(() => void) | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const existing = getConsent();
      setConsent(existing);
      if (!existing) setBannerVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleAccept = useCallback(() => {
    setConsent("accepted");
    setBannerVisible(false);
    pendingAcceptCallback?.();
    setPendingAcceptCallback(null);
  }, [pendingAcceptCallback]);

  const handleDecline = useCallback(() => {
    setConsent("declined");
    setBannerVisible(false);
    setPendingAcceptCallback(null);
  }, []);

  const requestConsent = useCallback((onAccept: () => void) => {
    const current = (localStorage.getItem(CONSENT_KEY) as ConsentValue) ?? null;
    if (current === "accepted") {
      onAccept();
      return;
    }
    // Store callback and show banner
    setPendingAcceptCallback(() => onAccept);
    setBannerVisible(true);
  }, []);

  return (
    <ConsentContext.Provider value={{ consent, requestConsent }}>
      {children}
      {bannerVisible && (
        <CookieConsent onAccept={handleAccept} onDecline={handleDecline} />
      )}
    </ConsentContext.Provider>
  );
}
