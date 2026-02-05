import { useState } from 'react';
import type { ConnectedSession } from '@claude-orchestrator/shared';
import { SLASH_COMMANDS } from '@claude-orchestrator/shared';

interface InputAreaProps {
  connectedSession: ConnectedSession | undefined;
  onSendMessage: (message: string) => Promise<void>;
  onControlSignal: (signal: string) => void;
  onSlashCommand: (command: string) => void;
  onConnect: () => void;
}

export function InputArea({
  connectedSession,
  onSendMessage,
  onControlSignal,
  onSlashCommand,
  onConnect,
}: InputAreaProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim() || sendingMessage) return;
    if (!connectedSession || connectedSession.status !== 'active') return;

    setSendingMessage(true);
    try {
      await onSendMessage(inputMessage.trim());
      setInputMessage('');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!connectedSession) {
    return (
      <div className="border-t border-white/10 p-4 flex-shrink-0 bg-[#0a0a0a]">
        <button
          onClick={onConnect}
          className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-icons">play_arrow</span>
          Connect to this session
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Connect to interact with this session in real-time
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 p-3 flex-shrink-0 bg-[#0a0a0a]">
      {/* Control Buttons */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onControlSignal('interrupt')}
            className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors flex items-center gap-1"
            title="Interrupt (Ctrl+C / Esc)"
          >
            <span className="material-icons text-sm">stop</span>
            Ctrl+C
          </button>
          <button
            onClick={() => onControlSignal('expand')}
            className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors flex items-center gap-1"
            title="Expand output (Ctrl+O)"
          >
            <span className="material-icons text-sm">unfold_more</span>
            Ctrl+O
          </button>
          <button
            onClick={() => onControlSignal('retry')}
            className="px-2 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition-colors flex items-center gap-1"
            title="Retry (Ctrl+R)"
          >
            <span className="material-icons text-sm">refresh</span>
            Ctrl+R
          </button>
        </div>
        <div className="flex-1" />
        {/* Slash Commands Dropdown */}
        <div className="relative group">
          <button className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-400 rounded transition-colors flex items-center gap-1">
            <span className="material-icons text-sm">terminal</span>
            Commands
            <span className="material-icons text-sm">expand_more</span>
          </button>
          <div className="absolute bottom-full right-0 mb-1 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl hidden group-hover:block z-50">
            {SLASH_COMMANDS.map(({ cmd, desc }) => (
              <button
                key={cmd}
                onClick={() => onSlashCommand(cmd)}
                className="w-full px-3 py-1.5 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
              >
                <span className="text-blue-400 text-xs font-mono">{cmd}</span>
                <span className="text-gray-500 text-xs">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            connectedSession.status === 'active'
              ? 'Send a message... (Enter to send)'
              : 'Waiting for session...'
          }
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500 placeholder-gray-500"
          rows={2}
          disabled={sendingMessage || connectedSession.status !== 'active'}
        />
        <button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || sendingMessage || connectedSession.status !== 'active'}
          className={`px-4 rounded-lg font-medium text-sm transition-colors ${
            inputMessage.trim() && !sendingMessage && connectedSession.status === 'active'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          {sendingMessage ? (
            <span className="material-icons animate-spin text-lg">refresh</span>
          ) : (
            <span className="material-icons text-lg">send</span>
          )}
        </button>
      </div>
      <div className="text-xs text-gray-600 mt-1">
        Shortcuts: Ctrl+C (interrupt) · Ctrl+O (expand) · Ctrl+R (retry) · Esc (stop)
      </div>
    </div>
  );
}
