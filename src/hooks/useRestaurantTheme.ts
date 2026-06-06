import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/constants";
import type { RestaurantTheme } from "@/types";

/** Default fallback theme applied when the API response is incomplete. */
export const DEFAULT_THEME: RestaurantTheme = {
  restaurantName: "Restaurant",
  tagline: "",
  hours: "",
  serviceTypes: "Dine-in · Takeaway",
  footerNote: "All prices include applicable taxes. Made fresh to order.",
  colors: {
    primary: "#FFFFFF",
    primaryForeground: "#0A0A0A",
    background: "#0A0A0A",
    foreground: "#F5F5F5",
    card: "rgba(255,255,255,0.04)",
    accent: "rgba(255,255,255,0.08)",
    muted: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.08)",
    ring: "rgba(255,255,255,0.25)",
    destructive: "#EF4444",
  },
};

/**
 * Fetch the branding/theme for a given restaurant slug.
 * Falls back gracefully to `DEFAULT_THEME` on network errors.
 *
 * The server should return a `RestaurantTheme` payload at:
 *   GET /v1/menu/:slug/theme
 */
export function useRestaurantTheme(slug: string) {
  return useQuery<RestaurantTheme>({
    queryKey: QUERY_KEYS.theme(slug),
    queryFn: async () => {
      try {
        const response = await api.get<{ data: RestaurantTheme }>(
          `/menu/${slug}/theme`
        );
        return {
          ...DEFAULT_THEME,
          ...response.data.data,
          // Deep-merge colors so DEFAULT_THEME fallbacks for card/muted/border/ring/
          // destructive are preserved when the server only returns primary/accent/bg/fg.
          colors: { ...DEFAULT_THEME.colors, ...response.data.data.colors },
        };
      } catch {
        // Degrade gracefully — the menu still renders with defaults.
        return DEFAULT_THEME;
      }
    },
    enabled: !!slug,
    // Theme rarely changes — cache for the session.
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}