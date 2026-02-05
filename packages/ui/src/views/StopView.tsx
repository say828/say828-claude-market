import { useState, useMemo } from 'react';
import Header from '../components/Header';
import type { StopContext } from '../api';

interface Props {
  context: StopContext;
}

interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

function parseTranscript(transcript: string): TranscriptMessage[] {
  try {
    const data = JSON.parse(transcript);
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        role: item.role || 'assistant',
        content: typeof item.content === 'string'
          ? item.content
          : JSON.stringify(item.content, null, 2),
        timestamp: item.timestamp
      }));
    }
    return [];
  } catch {
    // If not JSON, treat as plain text
    return [{ role: 'assistant', content: transcript }];
  }
}

export default function StopView({ context }: Props) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completedAction, setCompletedAction] = useState<'acknowledge' | 'continue'>('acknowledge');

  const messages = useMemo(() => {
    if (!context.transcript) return [];
    return parseTranscript(context.transcript);
  }, [context.transcript]);

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/stop-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' })
      });
      if (res.ok) {
        setCompletedAction('acknowledge');
        setIsComplete(true);
        setTimeout(() => { try { window.close(); } catch {} }, 500);
      }
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/stop-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'continue', prompt })
      });
      if (res.ok) {
        setCompletedAction('continue');
        setIsComplete(true);
        setTimeout(() => { try { window.close(); } catch {} }, 500);
      }
    } catch (err) {
      console.error('Failed to continue:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass p-12 text-center max-w-md">
          <div className="text-6xl mb-4">
            {completedAction === 'continue' ? '🚀' : '✅'}
          </div>
          <h2 className="text-2xl font-bold text-heading mb-2">
            {completedAction === 'continue' ? 'Prompt Sent' : 'Session Ended'}
          </h2>
          <p className="text-muted">
            You can close this tab and return to Claude Code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="max-w-4xl mx-auto">
        <Header
          title="Task Completed"
          subtitle={context.reason}
          icon="✅"
          badge={{ text: 'Done', variant: 'safe' }}
        />

        {/* Session Transcript - Terminal Style */}
        {messages.length > 0 && (
          <div className="glass mb-6 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-muted ml-2">Session Transcript</span>
            </div>
            <div className="bg-black/50 p-4 max-h-[60vh] overflow-y-auto font-mono text-sm">
              {messages.map((msg, idx) => (
                <div key={idx} className="mb-3">
                  <span className={`${
                    msg.role === 'user' ? 'text-cyan-400' :
                    msg.role === 'system' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {msg.role === 'user' ? '❯ ' : msg.role === 'system' ? '⚙ ' : '◆ '}
                  </span>
                  <span className={`text-xs uppercase mr-2 ${
                    msg.role === 'user' ? 'text-cyan-400' :
                    msg.role === 'system' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    [{msg.role}]
                  </span>
                  <span className="text-gray-300 whitespace-pre-wrap">{msg.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary if available */}
        {context.summary && (
          <div className="glass-subtle p-5 mb-6">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Summary
            </h3>
            <p className="text-heading whitespace-pre-wrap">{context.summary}</p>
          </div>
        )}

        {/* Continue with prompt */}
        <div className="glass p-6 mb-6">
          <h3 className="text-lg font-semibold text-heading mb-3">Continue Working</h3>
          <p className="text-sm text-muted mb-4">
            Enter a follow-up prompt to continue the conversation
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your follow-up request..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg resize-none mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={handleContinue}
              disabled={isSubmitting || !prompt.trim()}
              className={`btn-primary px-6 py-2 flex-1 ${isSubmitting || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Sending...' : 'Continue'}
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={isSubmitting}
              className={`btn-approve px-6 py-2 ${isSubmitting ? 'opacity-50' : ''}`}
            >
              Done
            </button>
          </div>
        </div>

        {/* Session info footer */}
        <div className="text-center text-xs text-muted">
          Session: {context.sessionId || 'N/A'}
        </div>
      </div>
    </div>
  );
}
