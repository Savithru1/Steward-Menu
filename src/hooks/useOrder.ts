import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { QUERY_KEYS, SOCKET_EVENTS, SOCKET_ROOMS } from "@/lib/constants";
import { getSocket } from "@/lib/sockets";
import { useGuestIdentity } from "@/hooks/useGuestIdentity";
import type {
  CreateOrderPayload,
  OrderResponse,
  OrderStatus,
  OrderStatusChangedPayload,
} from "@/types";

export type {
  CreateOrderPayload,
  OrderItem,
  OrderResponse,
  OrderStatus,
  OrderType,
} from "@/types";

const RECALL_TOKEN_PREFIX = "steward_order_token_";

function saveRecallToken(restaurantSlug: string, token: string) {
  try {
    sessionStorage.setItem(`${RECALL_TOKEN_PREFIX}${restaurantSlug}`, token);
  } catch { /* blocked */ }
}

function getRecallToken(restaurantSlug: string): string | null {
  try {
    return sessionStorage.getItem(`${RECALL_TOKEN_PREFIX}${restaurantSlug}`);
  } catch { return null; }
}

/**
 * Submit a new order for a given restaurant slug.
 * Automatically attaches the guestId for order history tracking.
 * Saves the returned recall JWT to localStorage.
 */
export function useCreateOrder(slug: string) {
  const { guestId } = useGuestIdentity();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const response = await api.post<{ data: OrderResponse & { recallToken?: string } }>(
        `/orders/${slug}`,
        {
          ...payload,
          // Send guestId if available — backend stores it on the Order
          ...(guestId ? { guestId } : {}),
        }
      );
      const data = response.data.data;

      // Persist the recall token so orders can be retrieved even after cookie clear
      if (data.recallToken) {
        saveRecallToken(slug, data.recallToken);
      }

      return data;
    },
  });
}

interface UseOrderTrackingOptions {
  refetchInterval?: number;
}

/**
 * Poll + live-track a specific order by its ID.
 */
export function useOrderTracking(
  orderId: string | null,
  slug: string | null,
  options: UseOrderTrackingOptions = {}
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: orderId ? QUERY_KEYS.order(orderId) : ["order", null],
    queryFn: async () => {
      if (!orderId) return null;
      const token = slug ? getRecallToken(slug) : undefined;
      const response = await api.get<{ data: OrderResponse }>(
        `/orders/${orderId}/track`,
        { params: token ? { token } : {} }
      );
      return response.data.data;
    },
    enabled: !!orderId,
    refetchInterval: options.refetchInterval,
  });

  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();
    const room = SOCKET_ROOMS.order(orderId);

    const joinOrder = () => socket.emit(SOCKET_EVENTS.JOIN_ROOM, room);

    const handleStatusChanged = (
      data: OrderStatusChangedPayload | { orderId: string; status: OrderStatus }
    ) => {
      if (data.orderId !== orderId) return;
      queryClient.setQueryData<OrderResponse | null>(
        QUERY_KEYS.order(orderId),
        (oldData) => {
          if (!oldData) return oldData;
          return { ...oldData, status: data.status };
        }
      );
    };

    const handleOrderReady = (data: { orderId: string }) => {
      if (data.orderId !== orderId) return;
      handleStatusChanged({ orderId, status: "READY" });
    };

    const handleOrderUpdated = (data: OrderResponse) => {
      if (data.id !== orderId) return;
      queryClient.setQueryData<OrderResponse | null>(
        QUERY_KEYS.order(orderId),
        (oldData) => {
          if (!oldData) return oldData;
          return { ...oldData, ...data };
        }
      );
    };

    const handleOrderCancelled = (data: { id?: string; orderId?: string }) => {
      const id = data?.id ?? data?.orderId;
      if (id !== orderId) return;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(orderId) });
    };

    socket.on("connect", joinOrder);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
    socket.on(SOCKET_EVENTS.KITCHEN_ORDER_READY, handleOrderReady);
    socket.on("order_updated", handleOrderUpdated);
    socket.on("order:updated", handleOrderUpdated);
    socket.on("order_cancelled", handleOrderCancelled);

    if (socket.connected) {
      joinOrder();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", joinOrder);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
      socket.off(SOCKET_EVENTS.KITCHEN_ORDER_READY, handleOrderReady);
      socket.off("order_updated", handleOrderUpdated);
      socket.off("order:updated", handleOrderUpdated);
      socket.off("order_cancelled", handleOrderCancelled);
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, room);
    };
  }, [orderId, queryClient]);

  return query;
}

/**
 * Retrieve all orders placed by this guest for a given restaurant slug.
 * Falls back to the recall endpoint if guestId cookie is cleared but a token exists.
 */
export function useGuestOrders(slug: string) {
  const { guestId } = useGuestIdentity();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["guest-orders", slug, guestId],
    queryFn: async () => {
      const recallToken = getRecallToken(slug);
      if (recallToken) {
        const response = await api.get<{ data: OrderResponse[] }>(
          "/orders/recall",
          { params: { token: recallToken } }
        );
        return response.data.data ?? [];
      }

      return [];
    },
    enabled: !!getRecallToken(slug),
    staleTime: 30_000,
  });

  useEffect(() => {
    // Only connect if the query is actually enabled
    if (!guestId && !getRecallToken(slug)) return;

    const socket = getSocket();
    const room = SOCKET_ROOMS.restaurant(slug);

    const joinRoom = () => socket.emit(SOCKET_EVENTS.JOIN_ROOM, room);

    const handleStatusChanged = (
      data: OrderStatusChangedPayload | { orderId: string; status: OrderStatus }
    ) => {
      queryClient.setQueryData<OrderResponse[]>(
        ["guest-orders", slug, guestId],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((order) =>
            order.id === data.orderId ? { ...order, status: data.status } : order
          );
        }
      );
    };

    const handleOrderCancelled = () => {
      // Force full refetch on cancel as other fields might change
      queryClient.invalidateQueries({ queryKey: ["guest-orders", slug, guestId] });
    };

    socket.on("connect", joinRoom);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
    socket.on("order_cancelled", handleOrderCancelled);

    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", joinRoom);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
      socket.off("order_cancelled", handleOrderCancelled);
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, room);
    };
  }, [slug, guestId, queryClient]);

  return query;
}

/**
 * Cancel a guest's own order (only valid when status === NEW).
 */
export function useCancelGuestOrder(orderId: string, slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = getRecallToken(slug);
      if (!token) throw new Error("No recall token found");
      const response = await api.post<{ data: OrderResponse }>(
        `/orders/${orderId}/cancel`,
        { token }
      );
      return response.data.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.order(orderId) });

      const previousOrder = queryClient.getQueryData<OrderResponse>(QUERY_KEYS.order(orderId));

      if (previousOrder) {
        queryClient.setQueryData<OrderResponse>(QUERY_KEYS.order(orderId), {
          ...previousOrder,
          status: "CANCELLED",
        });
      }

      return { previousOrder };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(QUERY_KEYS.order(orderId), context.previousOrder);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.order(orderId), updated);
      queryClient.invalidateQueries({ queryKey: ["guest-orders"] });
    },
  });
}
