import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({ errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
          <div className="max-w-lg w-full bg-[#1a1a1a] border border-red-500/20 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-red-500 text-3xl">⚠️</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-400 mb-4">
                  The application encountered an unexpected error. Please try refreshing the page.
                </p>

                {this.state.error && (
                  <div className="mb-4 p-3 bg-black/30 rounded border border-red-500/20">
                    <div className="text-xs font-mono text-red-400 break-all">
                      {this.state.error.toString()}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Reload Page
                  </button>
                </div>

                {this.state.errorInfo && process.env.NODE_ENV !== 'production' && (
                  <details className="mt-4 text-xs">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-400">
                      Component Stack
                    </summary>
                    <pre className="mt-2 p-3 bg-black/30 rounded border border-gray-700 overflow-auto text-gray-400">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
