import type { SessionSummary, DisplayMessage, ConnectedSession } from '@claude-orchestrator/shared';
import { SessionHeader } from './SessionHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';

interface SessionDetailProps {
  session: SessionSummary;
  messages: DisplayMessage[];
  connectedSession: ConnectedSession | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
  onOpenEditor: (editor: string, path: string) => void;
  onSendMessage: (message: string) => Promise<void>;
  onControlSignal: (signal: string) => void;
  onSlashCommand: (command: string) => void;
}

export function SessionDetail({
  session,
  messages,
  connectedSession,
  onConnect,
  onDisconnect,
  onDelete,
  onOpenEditor,
  onSendMessage,
  onControlSignal,
  onSlashCommand,
}: SessionDetailProps) {
  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden min-h-0">
      <SessionHeader
        session={session}
        messages={messages}
        connectedSession={connectedSession}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onDelete={onDelete}
        onOpenEditor={onOpenEditor}
      />
      <MessageList messages={messages} connectedSession={connectedSession} />
      <InputArea
        connectedSession={connectedSession}
        onSendMessage={onSendMessage}
        onControlSignal={onControlSignal}
        onSlashCommand={onSlashCommand}
        onConnect={onConnect}
      />
    </div>
  );
}
