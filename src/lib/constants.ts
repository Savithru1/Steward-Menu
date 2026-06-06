export const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/v1";

const getWsUrl = (): string => {
  const envWsUrl = process.env.NEXT_PUBLIC_WS_URL;
  const envApiUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (envApiUrl && !envApiUrl.includes('localhost') && !envApiUrl.includes('127.0.0.1')) {
    if (!envWsUrl || envWsUrl.includes('localhost') || envWsUrl.includes('127.0.0.1')) {
      return envApiUrl.replace(/\/v\d+\/?$/, '');
    }
  }

  return envWsUrl ?? API_BASE_URL.replace(/\/v\d+\/?$/, "");
};

// Strip the /v1 path segment to get the bare socket server URL.
// e.g. "http://localhost:4000/v1" → "http://localhost:4000"
export const WS_URL = getWsUrl();

// REMOVED: RESTAURANT_ID — slugs are now dynamic from the URL.
// Use the `slug` parameter from `useParams()` or route props instead.

// TAX_RATE is intentionally not exported as a hardcoded constant.
// Tax rates vary per restaurant and are served via GET /v1/menu/:slug/theme
// (theme.taxRate). Access it with: const { taxRate } = useRestaurant()
// This prevents cart totals from silently using the wrong rate when a
// restaurant has configured a custom tax rate in their settings.

export const SOCKET_EVENTS = {
  ORDER_STATUS_CHANGED: "order:status_changed",
  KITCHEN_ORDER_READY: "kitchen:order_ready",
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  ITEM_AVAILABILITY_CHANGED: "item:availability_changed",
} as const;

export const SOCKET_ROOMS = {
  restaurant: (slug: string) => `restaurant:${slug}`,
  order: (id: string) => `order:${id}`,
} as const;

export const QUERY_KEYS = {
  menu: (slug: string) => ["menu", slug] as const,
  theme: (slug: string) => ["theme", slug] as const,
  menuItem: (id: string) => ["menuItem", id] as const,
  order: (id: string) => ["order", id] as const,
} as const;
