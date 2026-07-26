import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { QUERY_KEYS } from "@/lib/constants";
import type { MenuItemModifierGroup } from "@/types";

export function useItemModifiers(slug: string, itemId: string | null) {
  return useQuery<MenuItemModifierGroup[]>({
    queryKey: [...QUERY_KEYS.menuItem(itemId || ""), "modifiers"],
    queryFn: async () => {
      if (!itemId) return [];
      const response = await api.get<{ data: MenuItemModifierGroup[] }>(
        `/menu/${slug}/items/${itemId}/modifiers`
      );
      return response.data.data;
    },
    enabled: !!slug && !!itemId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
