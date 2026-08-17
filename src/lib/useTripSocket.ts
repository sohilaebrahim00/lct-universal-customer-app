import { useEffect, useRef, useState } from 'react';
import { wsBaseUrl } from './env';
import { supabase } from './supabase';
import type { TripStatus } from './tripStatus';

interface LocationUpdate {
  lat: number;
  lng: number;
  etaMinutes: number | null;
}

interface TripSocketState {
  status: TripStatus | null;
  location: LocationUpdate | null;
  connected: boolean;
}

const RECONNECT_DELAY_MS = 3000;

/**
 * Subscribes to live trip updates over the backend's WebSocket layer
 * (see lct-universal-backend/src/ws/server.ts). Falls back gracefully —
 * `connected: false` and no live updates — if Supabase isn't configured
 * (no token to authenticate the socket) or the connection drops; the
 * booking detail screen still shows the last known REST-fetched status
 * either way, so a dropped socket never blanks the UI.
 */
export function useTripSocket(bookingId: string | null): TripSocketState {
  const [state, setState] = useState<TripSocketState>({ status: null, location: null, connected: false });
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!bookingId || !supabase) return;

    let cancelled = false;

    async function connect() {
      const { data } = await supabase!.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled || !mounted.current) return;

      const socket = new WebSocket(`${wsBaseUrl}/ws/trips/${bookingId}?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (mounted.current) setState((s) => ({ ...s, connected: true }));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as
            | { type: 'status'; status: TripStatus }
            | { type: 'location'; lat: number; lng: number; etaMinutes?: number | null };

          if (!mounted.current) return;
          if (payload.type === 'status') {
            setState((s) => ({ ...s, status: payload.status }));
          } else if (payload.type === 'location') {
            setState((s) => ({ ...s, location: { lat: payload.lat, lng: payload.lng, etaMinutes: payload.etaMinutes ?? null } }));
          }
        } catch {
          // Ignore malformed frames rather than crashing the tracking screen.
        }
      };

      socket.onclose = () => {
        if (!mounted.current) return;
        setState((s) => ({ ...s, connected: false }));
        if (!cancelled) reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    void connect();

    return () => {
      cancelled = true;
      mounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [bookingId]);

  return state;
}
