import { useQuery } from "@tanstack/react-query";
import { api, getImageUrl } from "@/lib/api";
import { QUERY_KEYS, SOCKET_EVENTS } from "@/lib/constants";
import { getSocket } from "@/lib/sockets";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";
import type {
  ApiCategory,
  ApiMenuItem,
  ItemAvailabilityChangedPayload,
  RawApiMenuItem,
} from "@/types";

import { useRestaurant } from "@/components/providers/RestaurantContext";

export type { ApiCategory, ApiMenuItem, RawApiMenuItem };

/**
 * Fetch and subscribe to the live menu for a given restaurant slug.
 *
 * @param slug - The restaurant's URL slug, e.g. "spice-garden".
 *               Comes from the dynamic route param `[slug]`.
 */
export function useMenu(slug: string) {
  const { restaurantId } = useRestaurant();

  const query = useQuery({
    queryKey: QUERY_KEYS.menu(slug),
    queryFn: async () => {
      const response = await api.get<{ data: ApiCategory[] }>(`/menu/${slug}`);
      const categoriesData: ApiCategory[] = response.data.data;

      // Backend returns items nested under `menuItems` (Prisma relation name).
      const transformedItems: ApiMenuItem[] = categoriesData.flatMap(
        (category) => {
          const rawItems: RawApiMenuItem[] =
            (category as ApiCategory & { menuItems?: RawApiMenuItem[] })
              .menuItems ??
            category.items ??
            [];

          return rawItems.map(
            (item): ApiMenuItem => ({
              id: item.id,
              name: item.name,
              description: item.description ?? "",
              price: item.price,
              imageUrl: getImageUrl(item.imageUrl ?? ""),
              // Canonical field name — no more `eta` alias
              prepTimeMins: item.prepTimeMins ?? 15,
              isVeg: item.isVeg,
              isAvailable: item.isAvailable ?? true,  // Backend only returns available items; field may be absent in older select
              categoryId: category.id,
              // Canonical field name — no more `isBestseller` alias
              isPopular: item.isPopular ?? false,
            })
          );
        }
      );

      const categories = [
        { id: "all", name: "All" },
        ...categoriesData.map((c) => ({ id: c.id, name: c.name })),
      ];

      return { categories, items: transformedItems };
    },
    enabled: !!slug,
  });

  // Real-time availability updates from the restaurant socket room.
  useEffect(() => {
    if (!restaurantId) return;

    const socket = getSocket();
    const room = `restaurant:${restaurantId}`;

    const handleAvailabilityChanged = (
      payload: ItemAvailabilityChangedPayload
    ) => {
      // Surgical cache update — no full refetch needed.
      queryClient.setQueryData<{
        categories: { id: string; name: string }[];
        items: ApiMenuItem[];
      }>(QUERY_KEYS.menu(slug), (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) =>
            item.id === payload.itemId
              ? { ...item, isAvailable: payload.isAvailable }
              : item
          ),
        };
      });
    };

    const rejoin = () => {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, room);
    };

    if (!socket.connected) socket.connect();
    rejoin();
    socket.on("connect", rejoin);
    socket.on(SOCKET_EVENTS.ITEM_AVAILABILITY_CHANGED, handleAvailabilityChanged);

    return () => {
      socket.off("connect", rejoin);
      socket.off(SOCKET_EVENTS.ITEM_AVAILABILITY_CHANGED, handleAvailabilityChanged);
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, room);
    };
  }, [slug, restaurantId]);

  // markUnavailable is removed — cart no longer tracks item availability.
  // The socket update above patches the query cache directly.

  return query;
}
