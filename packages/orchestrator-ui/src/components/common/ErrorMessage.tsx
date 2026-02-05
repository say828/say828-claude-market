import React from 'react';

interface ErrorMessageProps {
  error: Error | string | null | undefined;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'default' | 'compact' | 'inline';
}

export function ErrorMessage({
  error,
  onRetry,
  onDismiss,
  className = '',
  variant = 'default'
}: ErrorMessageProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  // Inline variant - minimal styling for inline display
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-red-400 text-sm ${className}`}>
        <span className="material-icons text-base">error</span>
        <span>{errorMessage}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-blue-400 hover:text-blue-300 underline ml-2"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Compact variant - smaller box
  if (variant === 'compact') {
    return (
      <div className={`bg-red-500/10 border border-red-500/20 rounded p-3 ${className}`}>
        <div className="flex items-start gap-2">
          <span className="material-icons text-red-500 text-lg">error</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-red-400 break-words">{errorMessage}</div>
          </div>
          {(onRetry || onDismiss) && (
            <div className="flex gap-2 ml-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                  title="Retry"
                >
                  <span className="material-icons text-base">refresh</span>
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                  title="Dismiss"
                >
                  <span className="material-icons text-base">close</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant - full-featured error display
  return (
    <div className={`bg-red-500/10 border border-red-500/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="text-red-500 text-2xl">
          <span className="material-icons">error</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold mb-1">Error</h3>
          <p className="text-red-400 text-sm break-words">{errorMessage}</p>

          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition-colors"
                >
                  Retry
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded font-medium transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorMessage;
