import { useState, useCallback } from 'react';
import type {
  DisplayMessage,
  WebSessionMessage,
  ConnectedSession,
  WebSessionStatus,
} from '@claude-orchestrator/shared';
import { API_ENDPOINTS } from '@claude-orchestrator/shared';

interface UseSessionOptions {
  baseUrl: string;
}

interface UseSessionReturn {
  connectedSessions: Map<string, ConnectedSession>;
  connectSession: (cwd: string, resumeSessionId?: string) => Promise<string | null>;
  disconnectSession: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, message: string) => Promise<boolean>;
  sendControlSignal: (sessionId: string, signal: string) => Promise<boolean>;
  handleWebSessionMessage: (sessionId: string, message: WebSessionMessage) => void;
  fetchSessionMessages: (sessionId: string) => Promise<DisplayMessage[]>;
}

export function useSession({ baseUrl }: UseSessionOptions): UseSessionReturn {
  const [connectedSessions, setConnectedSessions] = useState<Map<string, ConnectedSession>>(
    new Map()
  );

  const handleWebSessionMessage = useCallback((sessionId: string, msg: WebSessionMessage) => {
    setConnectedSessions((prev) => {
      const newMap = new Map(prev);
      const session = newMap.get(sessionId);
      if (session) {
        const newMessages = [...session.messages, msg];
        let newStatus: WebSessionStatus = session.status;
        if (msg.type === 'status') {
          if (msg.status === 'completed') newStatus = 'completed';
          else if (msg.status === 'error') newStatus = 'error';
          else if (msg.status === 'started') newStatus = 'active';
        }
        newMap.set(sessionId, { status: newStatus, messages: newMessages });
      }
      return newMap;
    });
  }, []);

  const connectSession = useCallback(
    async (cwd: string, resumeSessionId?: string): Promise<string | null> => {
      try {
        // If resuming, first fetch the existing session messages
        let existingMessages: WebSessionMessage[] = [];
        if (resumeSessionId) {
          try {
            const historyRes = await fetch(`${baseUrl}${API_ENDPOINTS.session(resumeSessionId)}`);
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              existingMessages = (historyData.messages || [])
                .map((msg: DisplayMessage) => {
                  if (msg.role === 'user') {
                    return { type: 'text' as const, content: `> ${msg.content}` };
                  } else if (msg.role === 'assistant') {
                    const messages: WebSessionMessage[] = [];
                    if (msg.toolUse) {
                      messages.push({
                        type: 'tool_use' as const,
                        toolUse: { id: msg.id, name: msg.toolUse.name, input: msg.toolUse.input },
                      });
                    }
                    if (msg.toolResult) {
                      messages.push({
                        type: 'tool_result' as const,
                        toolResult: {
                          toolUseId: msg.id,
                          content: msg.toolResult.content,
                          isError: msg.toolResult.isError,
                        },
                      });
                    }
                    if (msg.content) {
                      messages.push({ type: 'text' as const, content: msg.content });
                    }
                    return messages;
                  }
                  return { type: 'text' as const, content: `[${msg.role}]` };
                })
                .flat();
            }
          } catch (e) {
            console.error('Failed to fetch session history:', e);
          }
        }

        const res = await fetch(`${baseUrl}${API_ENDPOINTS.webSession}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cwd, resumeSessionId }),
        });

        if (res.ok) {
          const data = await res.json();
          const sessionId = resumeSessionId || data.sessionId;

          setConnectedSessions((prev) => {
            const newMap = new Map(prev);
            newMap.set(sessionId, {
              status: data.status || 'active',
              messages: existingMessages,
            });
            return newMap;
          });

          return data.sessionId;
        } else {
          const data = await res.json();
          throw new Error(data.error || 'Failed to connect to session');
        }
      } catch (err) {
        console.error('Failed to connect to session:', err);
        return null;
      }
    },
    [baseUrl]
  );

  const disconnectSession = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        await fetch(`${baseUrl}${API_ENDPOINTS.webSessionAction(sessionId, '')}`, {
          method: 'DELETE',
        });
        setConnectedSessions((prev) => {
          const newMap = new Map(prev);
          newMap.delete(sessionId);
          return newMap;
        });
      } catch (err) {
        console.error('Failed to disconnect session:', err);
      }
    },
    [baseUrl]
  );

  const sendMessage = useCallback(
    async (sessionId: string, message: string): Promise<boolean> => {
      // Add user message to UI immediately
      setConnectedSessions((prev) => {
        const newMap = new Map(prev);
        const session = newMap.get(sessionId);
        if (session) {
          newMap.set(sessionId, {
            ...session,
            messages: [...session.messages, { type: 'text', content: `> ${message}` }],
          });
        }
        return newMap;
      });

      try {
        const res = await fetch(`${baseUrl}${API_ENDPOINTS.webSessionAction(sessionId, 'message')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        return res.ok;
      } catch (err) {
        console.error('Failed to send message:', err);
        return false;
      }
    },
    [baseUrl]
  );

  const sendControlSignal = useCallback(
    async (sessionId: string, signal: string): Promise<boolean> => {
      try {
        const res = await fetch(`${baseUrl}${API_ENDPOINTS.webSessionAction(sessionId, 'control')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signal }),
        });
        return res.ok;
      } catch (err) {
        console.error('Failed to send control signal:', err);
        return false;
      }
    },
    [baseUrl]
  );

  const fetchSessionMessages = useCallback(
    async (sessionId: string): Promise<DisplayMessage[]> => {
      try {
        const res = await fetch(`${baseUrl}${API_ENDPOINTS.session(sessionId)}`);
        if (res.ok) {
          const data = await res.json();
          return data.messages || [];
        }
        return [];
      } catch (err) {
        console.error('Failed to fetch session:', err);
        return [];
      }
    },
    [baseUrl]
  );

  return {
    connectedSessions,
    connectSession,
    disconnectSession,
    sendMessage,
    sendControlSignal,
    handleWebSessionMessage,
    fetchSessionMessages,
  };
}
