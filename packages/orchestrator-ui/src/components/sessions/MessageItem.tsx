import { useState } from 'react';
import type { DisplayMessage, WebSessionMessage } from '@claude-orchestrator/shared';
import { ColorizedText } from '../common/ColorizedText';
import { getToolColor, formatToolInput } from '../../utils/tools';

interface MessageItemProps {
  message: DisplayMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const [expanded, setExpanded] = useState(false);

  if (message.role === 'user' && message.content) {
    return (
      <div className="flex items-start gap-2">
        <span className="text-green-400 font-bold">&gt;</span>
        <span className="text-white whitespace-pre-wrap">
          <ColorizedText text={message.content} />
        </span>
      </div>
    );
  }

  if (message.role === 'assistant') {
    return (
      <>
        {message.toolUse && (
          <div className="flex items-start gap-2 mb-1">
            <span className="text-yellow-400">●</span>
            <span className={getToolColor(message.toolUse.name)}>{message.toolUse.name}</span>
            <span className="text-gray-500">(</span>
            <span className="text-gray-300">
              {formatToolInput(message.toolUse.name, message.toolUse.input)}
            </span>
            <span className="text-gray-500">)</span>
          </div>
        )}
        {message.toolResult && (
          <div className="ml-4 mt-1">
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-2 py-1 -ml-2"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="text-gray-500">└</span>
              {message.toolResult.isError ? (
                <span className="text-red-400">Error</span>
              ) : (
                <span className="text-gray-400">
                  {message.toolResult.content.split('\n').length} lines
                </span>
              )}
              <span className="text-gray-600 text-xs">
                (click to {expanded ? 'collapse' : 'expand'})
              </span>
            </div>
            {expanded && (
              <pre
                className={`mt-2 p-3 rounded text-xs overflow-x-auto ${
                  message.toolResult.isError ? 'bg-red-500/10' : 'bg-white/5'
                }`}
              >
                <ColorizedText text={message.toolResult.content} />
              </pre>
            )}
          </div>
        )}
        {message.content && !message.toolUse && (
          <div className="whitespace-pre-wrap">
            <ColorizedText text={message.content} />
          </div>
        )}
      </>
    );
  }

  return null;
}

interface WebSessionMessageItemProps {
  message: WebSessionMessage;
}

export function WebSessionMessageItem({ message }: WebSessionMessageItemProps) {
  if (message.type === 'text' && message.content) {
    const isUserMessage = message.content.startsWith('>');
    return (
      <div className={`whitespace-pre-wrap ${isUserMessage ? 'text-green-400' : ''}`}>
        <ColorizedText text={message.content} />
      </div>
    );
  }

  if (message.type === 'tool_use' && message.toolUse) {
    return (
      <div className="flex items-start gap-2">
        <span className="text-yellow-400">●</span>
        <span className={getToolColor(message.toolUse.name)}>{message.toolUse.name}</span>
        <span className="text-gray-400 text-xs">
          {formatToolInput(message.toolUse.name, message.toolUse.input)}
        </span>
      </div>
    );
  }

  if (message.type === 'tool_result' && message.toolResult) {
    return (
      <div className={`ml-4 text-xs ${message.toolResult.isError ? 'text-red-400' : ''}`}>
        <ColorizedText
          text={`└ ${message.toolResult.content.split('\n')[0].slice(0, 150)}`}
        />
      </div>
    );
  }

  if (message.type === 'error') {
    return (
      <div className="text-red-400">
        Error: <ColorizedText text={message.content || ''} />
      </div>
    );
  }

  if (message.type === 'status') {
    return (
      <div className="text-purple-400 text-xs">
        ● {message.status}: {message.content || ''}
      </div>
    );
  }

  return null;
}
