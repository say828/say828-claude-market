import { useEffect, useRef, useState, useCallback } from 'react';
import type { SessionSummary, DashboardStats, HookAlert, WebSessionMessage, NotificationSettings } from '@claude-orchestrator/shared';
import { RECONNECT_DELAY_MS, WS_EVENTS } from '@claude-orchestrator/shared';

interface UseWebSocketOptions {
  serverUrl: string;
  enabledHooks: NotificationSettings['enabledHooks'];
  onHookAlert?: (alert: HookAlert) => void;
  onWebSessionMessage?: (sessionId: string, message: WebSessionMessage) => void;
}

interface UseWebSocketReturn {
  connected: boolean;
  sessions: SessionSummary[];
  stats: DashboardStats;
  subscribeToWebSession: (sessionId: string) => void;
  unsubscribeFromWebSession: (sessionId: string) => void;
}

export function useWebSocket({
  serverUrl,
  enabledHooks,
  onHookAlert,
  onWebSessionMessage,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    activeSessions: 0,
    pendingHooks: 0,
    projectCount: 0,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    // Determine WebSocket URL
    let wsUrl: string;
    if (serverUrl) {
      const url = new URL(serverUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProtocol}//${url.host}/ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case WS_EVENTS.init:
          case WS_EVENTS.sessionsUpdate: {
            const payload = data.type === WS_EVENTS.init ? data.data : { sessions: data.data };
            setSessions(payload.sessions || data.data);
            if (payload.stats) {
              setStats(payload.stats);
            }
            break;
          }

          case WS_EVENTS.hookAlert: {
            const alert: HookAlert = { ...data.data, receivedAt: Date.now() };
            if (enabledHooks[alert.hook.type as keyof typeof enabledHooks]) {
              onHookAlert?.(alert);
            }
            break;
          }

          case WS_EVENTS.webSession: {
            const sessionId = data.sessionId;
            const msg = data.data as WebSessionMessage;
            onWebSessionMessage?.(sessionId, msg);
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY_MS);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [serverUrl, enabledHooks, onHookAlert, onWebSessionMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribeToWebSession = useCallback((sessionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: WS_EVENTS.subscribeWebSession,
        sessionId,
      }));
    }
  }, []);

  const unsubscribeFromWebSession = useCallback((sessionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: WS_EVENTS.unsubscribeWebSession,
        sessionId,
      }));
    }
  }, []);

  return {
    connected,
    sessions,
    stats,
    subscribeToWebSession,
    unsubscribeFromWebSession,
  };
}
