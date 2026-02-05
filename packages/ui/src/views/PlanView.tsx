import { useEffect, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import Header from '../components/Header';
import type { PlanContext } from '../api';

interface Props {
  context: PlanContext;
}

type PlanDecision = 'approve' | 'feedback' | 'reject';

export default function PlanView({ context }: Props) {
  const [decision, setDecision] = useState<PlanDecision>('approve');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });
  }, [context.plan]);

  const html = marked(context.plan) as string;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/plan-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, feedback })
      });
      if (response.ok) {
        setIsComplete(true);
        // Try to close, but if it fails, user sees completion message
        setTimeout(() => {
          try { window.close(); } catch {}
        }, 500);
      }
    } catch (err) {
      console.error('Failed to submit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass p-12 text-center max-w-md">
          <div className="text-6xl mb-4">
            {decision === 'approve' ? '✅' : decision === 'feedback' ? '💬' : '❌'}
          </div>
          <h2 className="text-2xl font-bold text-heading mb-2">
            {decision === 'approve' ? 'Plan Approved' :
             decision === 'feedback' ? 'Feedback Sent' : 'Plan Rejected'}
          </h2>
          <p className="text-muted">
            You can close this tab and return to Claude Code.
          </p>
        </div>
      </div>
    );
  }

  const options = [
    {
      value: 'approve',
      label: 'Approve Plan',
      description: 'Start implementing the plan as described'
    },
    {
      value: 'feedback',
      label: 'Provide Feedback',
      description: 'Request changes or clarifications to the plan'
    },
    {
      value: 'reject',
      label: 'Reject Plan',
      description: 'Decline the plan and stop'
    }
  ];

  return (
    <div className="min-h-screen p-6">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="max-w-4xl mx-auto">
        <Header
          title="Plan Review"
          subtitle="Review the proposed implementation plan"
          icon="📋"
          badge={{ text: context.permissionMode || 'plan', variant: 'primary' }}
        />

        {/* Plan Content */}
        <div className="glass p-8 mb-6 glow-purple">
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        {/* Decision Options */}
        <div className="glass p-6 mb-6">
          <h3 className="text-lg font-semibold text-heading mb-4">Choose an action</h3>
          <div className="space-y-3">
            {options.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                  decision === option.value
                    ? 'glass-strong border-l-2 border-l-indigo-500'
                    : 'hover:bg-white/5'
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  value={option.value}
                  checked={decision === option.value}
                  onChange={(e) => setDecision(e.target.value as PlanDecision)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-heading">{option.label}</div>
                  <div className="text-sm text-muted">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Feedback Input */}
        <div className="glass p-6 mb-6">
          <h3 className="text-lg font-semibold text-heading mb-3">
            {decision === 'approve' ? 'Additional Instructions (Optional)' : 'Feedback / Instructions'}
          </h3>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={
              decision === 'approve'
                ? 'Any additional instructions for implementation...'
                : decision === 'feedback'
                ? 'Describe what changes or clarifications you need...'
                : 'Reason for rejection...'
            }
            rows={4}
            className="w-full px-4 py-3 rounded-lg resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="glass p-4 flex justify-end gap-4">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (decision !== 'approve' && !feedback.trim())}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              decision === 'approve'
                ? 'btn-approve'
                : decision === 'feedback'
                ? 'btn-primary'
                : 'btn-deny'
            } ${isSubmitting || (decision !== 'approve' && !feedback.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Submitting...' :
              decision === 'approve' ? 'Approve & Start' :
              decision === 'feedback' ? 'Send Feedback' :
              'Reject Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
