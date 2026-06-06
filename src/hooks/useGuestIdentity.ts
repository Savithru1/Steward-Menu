"use client";

import { useEffect, useState } from "react";
import { getConsent } from "@/components/consent/CookieConsent";

const STORAGE_KEY = "steward_guest_id";
const COOKIE_NAME = "steward_guest_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readFromStorage(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const localGuestId = localStorage.getItem(STORAGE_KEY);
    if (localGuestId) return localGuestId;
  } catch {
    // Storage may be blocked in private contexts.
  }

  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (match) return match.split("=")[1];
  } catch {
    // Cookie access may be blocked.
  }

  return null;
}

export function persistToStorage(id: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage full or blocked.
  }

  try {
    document.cookie = `${COOKIE_NAME}=${id}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } catch {
    // Cookie write blocked.
  }
}

function persistLocalOnly(id: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage full or blocked.
  }
}

export function useGuestIdentity(): {
  guestId: string | null;
  persistToStorage: (id: string) => void;
} {
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const consent = getConsent();
      const existing = readFromStorage();

      if (existing) {
        setGuestId(existing);
        return;
      }

      const newId = generateUUID();

      if (consent === "accepted") {
        persistToStorage(newId);
      } else if (consent === "declined") {
        persistLocalOnly(newId);
      }

      setGuestId(newId);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return { guestId, persistToStorage };
}

export function getGuestId(): string | null {
  if (typeof window === "undefined") return null;
  return readFromStorage();
}
