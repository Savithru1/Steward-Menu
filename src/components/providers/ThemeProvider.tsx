"use client";

import { useEffect, useRef } from "react";
import { useRestaurantTheme } from "@/hooks/useRestaurantTheme";
import { RestaurantProvider } from "@/components/providers/RestaurantContext";
import { DEFAULT_THEME } from "@/hooks/useRestaurantTheme";
import type { RestaurantTheme, RestaurantThemeColors } from "@/types";
import { useCartStore } from "@/store/cartStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert any hex (3 or 6 char, with or without #) to "R, G, B" string. */
function hexToRgb(hex: string): string | null {
  if (!hex || typeof hex !== "string") return null;
  const cleaned = hex.trim();
  // Handle rgba(...) strings by extracting R,G,B
  const rgbaMatch = cleaned.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbaMatch) return `${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}`;
  // Hex
  let c = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length !== 6) return null;
  const num = parseInt(c, 16);
  if (isNaN(num)) return null;
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

/** Parse hex → [r, g, b] as 0–255 integers. */
function hexToRgbArray(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const parts = rgb.split(",").map((v) => parseInt(v.trim()));
  if (parts.length !== 3) return null;
  return [parts[0], parts[1], parts[2]];
}

/** Compute a rough luminance (0–1) from a hex color. */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.split(",").map((v) => parseInt(v.trim()) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Blend a foreground colour at a given opacity on top of a background colour.
 * Returns a hex string like "#1a1a1a".
 */
function blendAlpha(
  fgHex: string,
  bgHex: string,
  alpha: number
): string {
  const fg = hexToRgbArray(fgHex);
  const bg = hexToRgbArray(bgHex);
  if (!fg || !bg) return bgHex;
  const r = Math.round(fg[0] * alpha + bg[0] * (1 - alpha));
  const g = Math.round(fg[1] * alpha + bg[1] * (1 - alpha));
  const b = Math.round(fg[2] * alpha + bg[2] * (1 - alpha));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Given the resolved background and foreground colours, recompute every
 * opacity-based surface token so they render correctly on any background.
 *
 * Without this, all tokens are `rgba(255,255,255,0.x)` — they look fine on
 * the default dark background but break completely when the admin sets a
 * custom background colour.
 */
function recomputeDerivedVars(
  bgHex: string,
  fgHex: string,
  root: HTMLElement
): string[] {
  const applied: string[] = [];

  const set = (prop: string, value: string) => {
    root.style.setProperty(prop, value);
    applied.push(prop);
  };

  // Surface tokens — fg blended into bg at varying opacities
  set("--card",        blendAlpha(fgHex, bgHex, 0.04));
  set("--card-foreground", fgHex);
  set("--muted",       blendAlpha(fgHex, bgHex, 0.06));
  set("--accent",      blendAlpha(fgHex, bgHex, 0.08));
  set("--accent-foreground", fgHex);
  set("--border",      blendAlpha(fgHex, bgHex, 0.12));
  set("--input",       blendAlpha(fgHex, bgHex, 0.12));
  set("--ring",        blendAlpha(fgHex, bgHex, 0.30));
  set("--popover",     blendAlpha(fgHex, bgHex, 0.06));  // slightly raised
  set("--popover-foreground", fgHex);
  set("--secondary",   blendAlpha(fgHex, bgHex, 0.10));
  set("--secondary-foreground", fgHex);
  set("--muted-foreground", blendAlpha(fgHex, bgHex, 0.50));

  // Surface-raised bridge variable (used by parchment-bg etc.)
  set("--surface-raised", blendAlpha(fgHex, bgHex, 0.08));

  // RGB variants for components that need raw rgb values
  const bgRgb = hexToRgb(bgHex);
  const fgRgb = hexToRgb(fgHex);
  if (bgRgb) {
    set("--surface-raised-rgb", bgRgb);
  }
  if (fgRgb) {
    set("--on-surface-rgb", fgRgb);
  }

  return applied;
}

/**
 * Map RestaurantThemeColors → CSS custom-property names.
 * Only map keys that exist; callers are responsible for filtering nulls first.
 */
function applyColorVars(
  colors: Partial<RestaurantThemeColors>,
  root: HTMLElement
): string[] {
  const CSS_MAP: Record<keyof RestaurantThemeColors, string> = {
    primary:            "--primary",
    primaryForeground:  "--primary-foreground",
    secondary:          "--secondary",
    secondaryForeground:"--secondary-foreground",
    background:         "--background",
    foreground:         "--foreground",
    card:               "--card",
    accent:             "--accent",
    muted:              "--muted",
    border:             "--border",
    ring:               "--ring",
    destructive:        "--destructive",
  };

  const applied: string[] = [];

  for (const [key, cssVar] of Object.entries(CSS_MAP)) {
    const value = colors[key as keyof RestaurantThemeColors];
    if (value) {
      root.style.setProperty(cssVar, value);
      applied.push(cssVar);
    }
  }

  // ── Brand variables — only from primary/accent ──────────────────────────
  if (colors.primary) {
    root.style.setProperty("--brand-color", colors.primary);
    applied.push("--brand-color");
  }

  return applied;
}

// ── Font loader ───────────────────────────────────────────────────────────────

function loadGoogleFont(family: string): () => void {
  const id = "steward-theme-font";
  document.getElementById(id)?.remove();
  const link = document.createElement("link");
  link.id   = id;
  link.rel  = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
  return () => link.remove();
}

// ── ThemeApplier — fires after the theme resolves ─────────────────────────────

function ThemeApplier({ theme }: { theme: RestaurantTheme }) {
  const fontCleanupRef = useRef<(() => void) | null>(null);
  const appliedVarsRef = useRef<string[]>([]);

  useEffect(() => {
    const root = document.documentElement;

    // Only use colors that are actually set — don't merge with DEFAULT_THEME
    // colors so we don't accidentally override a light background with a
    // light foreground from the defaults.
    const themeColors: Partial<RestaurantThemeColors> = Object.fromEntries(
      Object.entries(theme.colors ?? {}).filter(([, v]) => v != null && v !== "")
    );

    // ── Step 1: Resolve background + foreground ───────────────────────────
    // Default to the CSS-defined baseline so derived vars are always correct.
    const resolvedBg  = themeColors.background  ?? "#0A0A0A";
    const resolvedFgFromTheme = themeColors.foreground;

    // Auto-compute foreground from background luminance if not explicitly set
    const autoFg = getLuminance(resolvedBg) > 0.5 ? "#0A0A0A" : "#F5F5F5";
    const resolvedFg = resolvedFgFromTheme ?? autoFg;

    // ── Step 2: Recompute ALL derived surface tokens from bg + fg ─────────
    // This must happen BEFORE applyColorVars so admin-explicit overrides win.
    const derivedApplied = recomputeDerivedVars(resolvedBg, resolvedFg, root);

    // ── Step 3: Apply explicit admin colour overrides ─────────────────────
    // These override the derived values above for any key the admin has set.
    const explicitApplied = applyColorVars(themeColors, root);

    // Make sure background and foreground are always set, even if not in themeColors
    if (!themeColors.background) {
      root.style.setProperty("--background", resolvedBg);
      explicitApplied.push("--background");
    }
    root.style.setProperty("--foreground", resolvedFg);
    if (!explicitApplied.includes("--foreground")) {
      explicitApplied.push("--foreground");
    }

    // ── Step 4: Auto-compute --primary-foreground from primary luminance ──
    // Only if the admin hasn't set it explicitly.
    if (themeColors.primary && !themeColors.primaryForeground) {
      const primaryLum = getLuminance(themeColors.primary);
      const autoFgForPrimary = primaryLum > 0.45 ? "#0A0A0A" : "#F5F5F5";
      root.style.setProperty("--primary-foreground", autoFgForPrimary);
      explicitApplied.push("--primary-foreground");
    }

    // ── Step 5: Update surface-raised-rgb and on-surface-rgb ─────────────
    const bgRgb = hexToRgb(resolvedBg);
    const fgRgb = hexToRgb(resolvedFg);
    if (bgRgb) root.style.setProperty("--surface-raised-rgb", bgRgb);
    if (fgRgb) root.style.setProperty("--on-surface-rgb", fgRgb);

    appliedVarsRef.current = [
      ...derivedApplied,
      ...explicitApplied,
      "--background",
      "--foreground",
      "--surface-raised-rgb",
      "--on-surface-rgb",
    ];

    // Font
    if (theme.fontFamily) {
      fontCleanupRef.current?.();
      fontCleanupRef.current = loadGoogleFont(theme.fontFamily);
      root.style.setProperty("--font-theme", `"${theme.fontFamily}", serif`);
      document.body.style.fontFamily = "var(--font-theme)";
    }

    return () => {
      for (const prop of appliedVarsRef.current) {
        root.style.removeProperty(prop);
      }
      root.style.removeProperty("--font-theme");
      document.body.style.fontFamily = "";
      fontCleanupRef.current?.();
    };
  }, [theme]);

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Wraps a restaurant route with:
 * - Live theme fetching (`/v1/menu/:slug/theme`)
 * - CSS variable injection on `<html>`
 * - Google Fonts loading
 * - `RestaurantProvider` context
 * - Cart isolation per restaurant
 */
export function ThemeProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const { data: theme } = useRestaurantTheme(slug);
  const initForRestaurant = useCartStore((s) => s.initForRestaurant);
  const setTaxRate        = useCartStore((s) => s.setTaxRate);

  useEffect(() => { initForRestaurant(slug); }, [slug, initForRestaurant]);

  useEffect(() => {
    if (theme?.taxRate !== undefined) setTaxRate(theme.taxRate);
  }, [theme?.taxRate, setTaxRate]);

  useEffect(() => {
    if (theme && theme.restaurantId) {
      localStorage.setItem("steward:restaurantSlug", slug);
      localStorage.setItem("steward:restaurantId", theme.restaurantId);
    }
  }, [slug, theme]);

  const resolvedTheme = theme ?? DEFAULT_THEME;

  return (
    <RestaurantProvider slug={slug} theme={resolvedTheme}>
      <ThemeApplier theme={resolvedTheme} />
      {children}
    </RestaurantProvider>
  );
}
