import { useState } from 'react';
import { approve, deny } from '../api';

interface Props {
  approveLabel?: string;
  denyLabel?: string;
  showDeny?: boolean;
  onApprove?: () => void;
  onDeny?: (message?: string) => void;
}

export default function ActionButtons({
  approveLabel = 'Approve',
  denyLabel = 'Deny',
  showDeny = true,
  onApprove,
  onDeny
}: Props) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completedAction, setCompletedAction] = useState<'approve' | 'deny'>('approve');

  const handleApprove = async () => {
    setLoading(true);
    try {
      if (onApprove) {
        onApprove();
      } else {
        await approve();
      }
      setCompletedAction('approve');
      setIsComplete(true);
      setTimeout(() => { try { window.close(); } catch {} }, 500);
    } catch (err) {
      console.error('Approve failed:', err);
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!showFeedback) {
      setShowFeedback(true);
      return;
    }
    setLoading(true);
    try {
      if (onDeny) {
        onDeny(feedback || undefined);
      } else {
        await deny(feedback || undefined);
      }
      setCompletedAction('deny');
      setIsComplete(true);
      setTimeout(() => { try { window.close(); } catch {} }, 500);
    } catch (err) {
      console.error('Deny failed:', err);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowFeedback(false);
    setFeedback('');
  };

  if (isComplete) {
    return (
      <div className="glass-strong p-8 mt-6 text-center">
        <div className="text-5xl mb-3">
          {completedAction === 'approve' ? '✅' : '❌'}
        </div>
        <h3 className="text-xl font-semibold text-heading mb-1">
          {completedAction === 'approve' ? 'Approved' : 'Denied'}
        </h3>
        <p className="text-sm text-muted">
          You can close this tab and return to Claude Code.
        </p>
      </div>
    );
  }

  if (showFeedback) {
    return (
      <div className="glass-strong p-6 mt-6">
        <label className="block text-sm font-medium text-muted mb-3">
          Feedback (optional)
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Explain why you're denying this action..."
          className="w-full px-4 py-3 rounded-xl resize-none placeholder-muted"
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="glass-btn px-5 py-2.5 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDeny}
            disabled={loading}
            className="btn-deny px-5 py-2.5 disabled:opacity-50"
          >
            {loading ? 'Denying...' : 'Confirm Deny'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-strong p-6 mt-6">
      <div className="flex justify-center gap-4">
        {showDeny && (
          <button
            onClick={handleDeny}
            disabled={loading}
            className="btn-deny px-8 py-3 min-w-[140px] disabled:opacity-50"
          >
            {denyLabel}
          </button>
        )}
        <button
          onClick={handleApprove}
          disabled={loading}
          className="btn-approve px-8 py-3 min-w-[140px] disabled:opacity-50"
        >
          {loading ? 'Processing...' : approveLabel}
        </button>
      </div>
    </div>
  );
}
