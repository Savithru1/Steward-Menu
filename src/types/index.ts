export type OrderStatus =
  | "NEW"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type OrderType = "TAKEAWAY" | "DELIVERY" | "COUNTER_PICKUP";

export type KitchenType = "MAIN" | "TIME_TAKING" | "READY_TO_SERVE";

// ── API envelope ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export interface RestaurantThemeColors {
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
  background?: string;
  foreground?: string;
  card?: string;
  accent?: string;
  muted?: string;
  border?: string;
  ring?: string;
  destructive?: string;
}

export interface RestaurantTheme {
  restaurantName: string;
  tagline?: string;
  logoUrl?: string;
  bannerUrl?: string;
  colors?: RestaurantThemeColors;
  fontFamily?: string;
  hours?: string;
  serviceTypes?: string;
  footerNote?: string;
  restaurantId?: string;
  restaurantSlug?: string;
  offlineMode?: boolean;
  taxRate?: number;
  showCalories?: boolean;
  showPrepTime?: boolean;
  showVegBadge?: boolean;
  menuLayout?: "grid" | "list";
}

// ── Menu ──────────────────────────────────────────────────────────────────────

export interface RawApiMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  kitchenType: KitchenType | string;
  prepTimeMins: number;
  categoryId: string;
  isPopular?: boolean;
  calories?: number;
}

export interface ApiMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string;
  prepTimeMins: number;
  isPopular?: boolean;
  calories?: number;
}

export interface ApiCategory {
  id: string;
  name: string;
  sortOrder?: number;
  menuItems?: RawApiMenuItem[];
  items?: RawApiMenuItem[];
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  isVeg: boolean;
  notes?: string;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface CreateOrderPayload {
  orderType: OrderType;
  notes?: string;
  deliveryAddress?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: {
    menuItemId: string;
    quantity: number;
    notes?: string;
  }[];
  paymentMethod?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  subtotal: string | number;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: OrderType;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  estimatedMins: number;
  createdAt: string;
  items: OrderItem[];
  restaurantId: string;
  razorpayOrderId?: string;
  paymentMethod: string;
  paymentStatus: string;
  /** Allocated unique payment amount for upi_qr orders (Decimal serialised as string). Null for all other methods. */
  paymentAmount?: string | null;
  /** Human-readable UPI reference, e.g. "STW-0042". Null for all other methods. */
  upiRef?: string | null;
  /** Restaurant UPI VPA, e.g. "merchant@upi". Null for all other methods. */
  upiId?: string | null;
  /** Token used to recall the order on next visit (guestId orders only). */
  recallToken?: string;
  estimatedPrepMins?: number;
}

// ── Socket payloads ───────────────────────────────────────────────────────────

export interface OrderStatusChangedPayload {
  orderId: string;
  status: OrderStatus;
  timestamp?: string;
}

export interface ItemAvailabilityChangedPayload {
  itemId: string;
  isAvailable: boolean;
}
