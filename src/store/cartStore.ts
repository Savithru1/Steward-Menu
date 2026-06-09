import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ApiMenuItem, CartItem } from "@/types";

export type { CartItem } from "@/types";

interface CartStore {
  /** The restaurant slug this cart belongs to. Cleared on restaurant change. */
  currentSlug: string | null;
  items: CartItem[];

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  /** Call once per restaurant route. Clears the cart when the slug changes. */
  initForRestaurant: (slug: string) => void;

  // ── Mutations ───────────────────────────────────────────────────────────────
  addItem: (item: ApiMenuItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;

  // ── Selectors ───────────────────────────────────────────────────────────────
  taxRate: number;
  setTaxRate: (rate: number) => void;
  getQuantity: (menuItemId: string) => number;
  hasItem: (menuItemId: string) => boolean;
  itemCount: () => number;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

function toCartItem(item: ApiMenuItem, quantity = 1): CartItem {
  return {
    menuItemId: item.id,
    name: item.name,
    price: item.price,
    quantity,
    imageUrl: item.imageUrl || null,
    isVeg: item.isVeg,
  };
}

/**
 * FIX 8.4 — Simplified migration normaliser for cart v3.
 * The LegacyCartItem (v1 `{ item, quantity }` shape) migration path has been
 * removed — the cart has been on version 3 long enough that no production data
 * should still carry the old format. Only the current CartItem shape is handled.
 */
function normalizePersistedItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((entry) => {
    const maybeCartItem = entry as Partial<CartItem>;
    if (typeof maybeCartItem.menuItemId !== 'string') return [];
    return [{
      menuItemId: maybeCartItem.menuItemId,
      name: maybeCartItem.name ?? '',
      price: Number(maybeCartItem.price ?? 0),
      quantity: Number(maybeCartItem.quantity ?? 1),
      imageUrl: maybeCartItem.imageUrl ?? null,
      isVeg: Boolean(maybeCartItem.isVeg),
      notes: maybeCartItem.notes,
    }];
  });
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      currentSlug: null,
      items: [],
      // Default is 0 — always call setTaxRate(theme.taxRate) after the theme
      // loads so the displayed cart totals reflect the restaurant's actual rate.
      // Using 0 as default rather than a hardcoded 5% prevents silently wrong totals.
      taxRate: 0,
      setTaxRate: (rate: number) => set({ taxRate: rate }),

      initForRestaurant: (slug: string) => {
        if (get().currentSlug !== slug) {
          set({ currentSlug: slug, items: [] });
        }
      },

      addItem: (item: ApiMenuItem) => {
        set((state) => {
          const existing = state.items.find((ci) => ci.menuItemId === item.id);
          if (existing) {
            return {
              items: state.items.map((ci) =>
                ci.menuItemId === item.id
                  ? { ...ci, quantity: ci.quantity + 1 }
                  : ci
              ),
            };
          }
          return { items: [...state.items, toCartItem(item)] };
        });
      },

      removeItem: (menuItemId: string) => {
        set((state) => ({
          items: state.items.filter((ci) => ci.menuItemId !== menuItemId),
        }));
      },

      updateQuantity: (menuItemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((ci) =>
            ci.menuItemId === menuItemId ? { ...ci, quantity } : ci
          ),
        }));
      },

      updateNotes: (menuItemId: string, notes: string) => {
        set((state) => ({
          items: state.items.map((ci) =>
            ci.menuItemId === menuItemId ? { ...ci, notes } : ci
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getQuantity: (menuItemId: string) =>
        get().items.find((ci) => ci.menuItemId === menuItemId)?.quantity ?? 0,

      hasItem: (menuItemId: string) =>
        get().items.some((ci) => ci.menuItemId === menuItemId),

      itemCount: () => get().items.reduce((sum, ci) => sum + ci.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, ci) => sum + ci.price * ci.quantity, 0),

      tax: () => Math.round(get().subtotal() * get().taxRate * 100) / 100,

      total: () => get().subtotal() + get().tax(),
    }),
    {
      name: "steward-cart",
      version: 3,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        currentSlug: state.currentSlug,
        items: state.items,
      }),
      migrate: (persistedState) => {
        const state = persistedState as {
          currentSlug?: unknown;
          items?: unknown;
        };
        return {
          currentSlug: typeof state?.currentSlug === "string" ? state.currentSlug : null,
          items: normalizePersistedItems(state?.items),
        };
      },
    }
  )
);
