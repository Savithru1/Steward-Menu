import { api } from './api';

const getSessionId = () => {
  if (typeof window === 'undefined') return 'server_session';
  let sid = sessionStorage.getItem('steward_sid');
  if (!sid) {
    sid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('steward_sid', sid);
  }
  return sid;
};

export type TelemetryEventType =
  | 'page_view'
  | 'item_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_start'
  | 'checkout_complete'
  | 'session_start';

interface TelemetryEvent {
  restaurantId: string;
  sessionId: string;
  customerId?: string | null;
  eventType: TelemetryEventType;
  metadata?: Record<string, any>;
  createdAt: string;
}

let telemetryQueue: TelemetryEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

export const telemetry = {
  track: (
    restaurantId: string,
    eventType: TelemetryEventType,
    metadata?: Record<string, any>,
    customerId?: string | null
  ) => {
    if (!restaurantId) return;

    telemetryQueue.push({
      restaurantId,
      sessionId: getSessionId(),
      customerId,
      eventType,
      metadata,
      createdAt: new Date().toISOString(),
    });

    if (!flushTimeout) {
      flushTimeout = setTimeout(() => {
        telemetry.flush();
      }, 5000); // Flush every 5s
    }
  },

  flush: async () => {
    if (telemetryQueue.length === 0) return;
    const events = [...telemetryQueue];
    telemetryQueue = [];
    if (flushTimeout) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }

    try {
      await api.post('/telemetry', { events });
    } catch (err) {
      // Re-queue on failure
      telemetryQueue = [...events, ...telemetryQueue];
    }
  },
};

// Auto flush when leaving page
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (telemetryQueue.length > 0) {
      // Use sendBeacon for reliable delivery on exit
      const events = [...telemetryQueue];
      telemetryQueue = [];
      const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
      navigator.sendBeacon(`${api.defaults.baseURL}/telemetry`, blob);
    }
  });
}
