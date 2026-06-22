import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

const URL = (import.meta as any).env?.VITE_REALTIME_URL || "http://localhost:4000";

export function useSocket(
  events: Record<string, (payload: any) => void> = {},
  enabled: boolean = true
) {
  const ref = useRef<Socket | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const socket = io(URL, { transports: ["websocket"], autoConnect: true });
    ref.current = socket;
    Object.entries(events).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => {
      Object.entries(events).forEach(([evt, fn]) => socket.off(evt, fn));
      socket.disconnect();
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return ref;
}
