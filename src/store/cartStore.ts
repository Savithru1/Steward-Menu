import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ApiMenuItem, CartItem, SelectedModifier } from "@/types";

export type { CartItem } from "@/types";

export function getCartItemKey(menuItemId: string, selectedModifiers?: SelectedModifier[]): string {
  if (!selectedModifiers || selectedModifiers.length === 0) {
    return menuItemId;
  }
  const sortedIds = [...selectedModifiers]
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((m) => m.optionId)
    .join(",");
  return `${menuItemId}:${sortedIds}`;
}

interface CartStore {
  /** The restaurant slug this cart belongs to. Cleared on restaurant change. */
  currentSlug: string | null;
  items: CartItem[];

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  /** Call once per restaurant route. Clears the cart when the slug changes. */
  initForRestaurant: (slug: string) => void;

  // ── Mutations ───────────────────────────────────────────────────────────────
  addItem: (item: ApiMenuItem, selectedModifiers?: SelectedModifier[], quantity?: number) => void;
  removeItem: (cartItemKey: string) => void;
  updateQuantity: (cartItemKey: string, quantity: number) => void;
  updateNotes: (cartItemKey: string, notes: string) => void;
  clearCart: () => void;

  // ── Selectors ───────────────────────────────────────────────────────────────
  taxRate: number;
  setTaxRate: (rate: number) => void;
  getQuantity: (cartItemKey: string) => number;
  hasItem: (cartItemKey: string) => boolean;
  itemCount: () => number;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

function toCartItem(item: ApiMenuItem, selectedModifiers?: SelectedModifier[], quantity = 1): CartItem {
  const modifierPriceAdjustment = selectedModifiers?.reduce((sum, m) => sum + m.priceAdjustment, 0) ?? 0;
  const unitPrice = Number(item.price) + modifierPriceAdjustment;

  return {
    menuItemId: item.id,
    name: item.name,
    price: Number(item.price),
    unitPrice,
    quantity,
    imageUrl: item.imageUrl || null,
    isVeg: item.isVeg,
    selectedModifiers: selectedModifiers || [],
  };
}

function normalizePersistedItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((entry) => {
    const maybeCartItem = entry as Partial<CartItem>;
    if (typeof maybeCartItem.menuItemId !== 'string') return [];
    const basePrice = Number(maybeCartItem.price ?? 0);
    const selectedModifiers: SelectedModifier[] = Array.isArray(maybeCartItem.selectedModifiers)
      ? maybeCartItem.selectedModifiers.map((m: any) => ({
          optionId: String(m.optionId),
          optionName: String(m.optionName),
          groupId: String(m.groupId),
          groupName: String(m.groupName),
          priceAdjustment: Number(m.priceAdjustment ?? 0),
        }))
      : [];
    const unitPrice = Number(maybeCartItem.unitPrice ?? (basePrice + selectedModifiers.reduce((sum, m) => sum + m.priceAdjustment, 0)));

    return [{
      menuItemId: maybeCartItem.menuItemId,
      name: maybeCartItem.name ?? '',
      price: basePrice,
      unitPrice,
      quantity: Number(maybeCartItem.quantity ?? 1),
      imageUrl: maybeCartItem.imageUrl ?? null,
      isVeg: Boolean(maybeCartItem.isVeg),
      notes: maybeCartItem.notes,
      selectedModifiers,
    }];
  });
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      currentSlug: null,
      items: [],
      taxRate: 0,
      setTaxRate: (rate: number) => set({ taxRate: rate }),

      initForRestaurant: (slug: string) => {
        if (get().currentSlug !== slug) {
          set({ currentSlug: slug, items: [] });
        }
      },

      addItem: (item: ApiMenuItem, selectedModifiers?: SelectedModifier[], quantity = 1) => {
        set((state) => {
          const itemKey = getCartItemKey(item.id, selectedModifiers);
          const existing = state.items.find((ci) => getCartItemKey(ci.menuItemId, ci.selectedModifiers) === itemKey);
          if (existing) {
            return {
              items: state.items.map((ci) =>
                getCartItemKey(ci.menuItemId, ci.selectedModifiers) === itemKey
                  ? { ...ci, quantity: ci.quantity + quantity }
                  : ci
              ),
            };
          }
          return { items: [...state.items, toCartItem(item, selectedModifiers, quantity)] };
        });
      },

      removeItem: (cartItemKey: string) => {
        set((state) => ({
          items: state.items.filter((ci) => getCartItemKey(ci.menuItemId, ci.selectedModifiers) !== cartItemKey),
        }));
      },

      updateQuantity: (cartItemKey: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(cartItemKey);
          return;
        }
        set((state) => ({
          items: state.items.map((ci) =>
            getCartItemKey(ci.menuItemId, ci.selectedModifiers) === cartItemKey ? { ...ci, quantity } : ci
          ),
        }));
      },

      updateNotes: (cartItemKey: string, notes: string) => {
        set((state) => ({
          items: state.items.map((ci) =>
            getCartItemKey(ci.menuItemId, ci.selectedModifiers) === cartItemKey ? { ...ci, notes } : ci
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getQuantity: (cartItemKey: string) =>
        get().items.find((ci) => getCartItemKey(ci.menuItemId, ci.selectedModifiers) === cartItemKey)?.quantity ?? 0,

      hasItem: (cartItemKey: string) =>
        get().items.some((ci) => getCartItemKey(ci.menuItemId, ci.selectedModifiers) === cartItemKey),

      itemCount: () => get().items.reduce((sum, ci) => sum + ci.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, ci) => sum + ci.unitPrice * ci.quantity, 0),

      tax: () => Math.round(get().subtotal() * get().taxRate * 100) / 100,

      total: () => get().subtotal() + get().tax(),
    }),
    {
      name: "steward-cart",
      version: 4,
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
