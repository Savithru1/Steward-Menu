"use client";

import { createContext, useContext } from "react";
import type { RestaurantTheme } from "@/types";

interface RestaurantContextValue {
  /** The restaurant's URL slug, e.g. "spice-garden" */
  slug: string;
  /** Resolved theme, including fallback defaults */
  theme: RestaurantTheme;
  restaurantId?: string;
  offlineMode?: boolean;
  taxRate?: number;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

/**
 * Access the current restaurant's slug and resolved theme.
 * Must be used inside a `RestaurantProvider`.
 */
export function useRestaurant(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext);
  if (!ctx) {
    throw new Error("useRestaurant must be used within a RestaurantProvider");
  }
  return ctx;
}

export function RestaurantProvider({
  slug,
  theme,
  children,
}: {
  slug: string;
  theme: RestaurantTheme;
  children: React.ReactNode;
}) {
  return (
    <RestaurantContext.Provider
      value={{
        slug,
        theme,
        restaurantId: theme.restaurantId,
        offlineMode: theme.offlineMode,
        taxRate: theme.taxRate,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}
