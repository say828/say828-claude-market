import { useState } from 'react';
import Header from '../components/Header';
import type { StopContext } from '../api';

interface Props {
  context: StopContext;
}

export default function StopView({ context }: Props) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completedAction, setCompletedAction] = useState<'acknowledge' | 'continue'>('acknowledge');

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

      <div className="max-w-2xl mx-auto">
        <Header
          title="Task Completed"
          subtitle="Claude has finished working"
          icon="✅"
          badge={{ text: 'Done', variant: 'safe' }}
        />

        {/* Success card */}
        <div className="glass p-8 glow-green mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center">
              <span className="text-5xl">✅</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-heading">Work Complete</h2>
              <p className="text-muted mt-1">Claude has finished the current task</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 mb-6">
          <div className="glass-subtle p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Completion Reason
            </h3>
            <p className="text-heading">{context.reason}</p>
          </div>

          {context.summary && (
            <div className="glass-subtle p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Summary
              </h3>
              <p className="text-heading whitespace-pre-wrap">{context.summary}</p>
            </div>
          )}

          <div className="glass-subtle p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Session
            </h3>
            <code className="text-indigo-400 text-sm">{context.sessionId?.slice(0, 12) || 'N/A'}...</code>
          </div>
        </div>

        {/* Continue with prompt */}
        <div className="glass p-6 mb-6">
          <h3 className="text-lg font-semibold text-heading mb-3">Continue Working (Optional)</h3>
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
          <button
            onClick={handleContinue}
            disabled={isSubmitting || !prompt.trim()}
            className={`btn-primary px-6 py-2 w-full ${isSubmitting || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Sending...' : 'Continue with Prompt'}
          </button>
        </div>

        {/* Acknowledge button */}
        <div className="glass-strong p-6">
          <div className="flex justify-center">
            <button
              onClick={handleAcknowledge}
              disabled={isSubmitting}
              className={`btn-approve px-10 py-3 min-w-[160px] ${isSubmitting ? 'opacity-50' : ''}`}
            >
              {isSubmitting ? 'Processing...' : 'Done - Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
