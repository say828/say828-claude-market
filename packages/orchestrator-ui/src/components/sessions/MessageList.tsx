import { useRef, useEffect } from 'react';
import type { DisplayMessage, WebSessionMessage, ConnectedSession } from '@claude-orchestrator/shared';
import { MessageItem, WebSessionMessageItem } from './MessageItem';
import { VirtualMessageList } from './VirtualMessageList';

interface MessageListProps {
  messages: DisplayMessage[];
  connectedSession: ConnectedSession | undefined;
}

const VIRTUAL_SCROLL_THRESHOLD = 100;

export function MessageList({ messages, connectedSession }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine which messages to display
  const displayMessages = connectedSession?.messages || messages;
  const messageCount = displayMessages.length;

  // Use virtual scrolling for large message lists
  const useVirtualScroll = messageCount > VIRTUAL_SCROLL_THRESHOLD;

  useEffect(() => {
    if (!useVirtualScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, connectedSession?.messages, useVirtualScroll]);

  // Use VirtualMessageList for large conversations
  if (useVirtualScroll) {
    return (
      <VirtualMessageList
        messages={messages}
        connectedSession={connectedSession}
      />
    );
  }

  // Standard rendering for smaller conversations
  if (connectedSession) {
    // Connected: Show real-time messages
    return (
      <div className="flex-1 overflow-y-auto font-mono text-sm min-h-0 p-4">
        {connectedSession.messages.length === 0 && connectedSession.status === 'active' && (
          <div className="text-gray-500 text-center py-8">
            <div className="text-3xl mb-2">💬</div>
            <div>Send a message to start</div>
          </div>
        )}
        {connectedSession.messages.map((msg, idx) => (
          <div key={idx} className="mb-2">
            <WebSessionMessageItem message={msg} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Not connected: Show history
  return (
    <div className="flex-1 overflow-y-auto font-mono text-sm min-h-0 p-4">
      {messages.map((msg) => (
        <div key={msg.id} className="border-b border-white/5 mb-2 pb-2">
          <MessageItem message={msg} />
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
