import { Component } from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree and displays fallback UI
 * Prevents entire app from crashing due to a single component error
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error caught by boundary:', error, errorInfo);

    // Store error info for display
    this.setState({ errorInfo });

    // Send to error tracking service if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: errorInfo,
        tags: {
          boundary: this.props.name || 'unnamed'
        }
      });
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          resetError: this.resetError
        });
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="error-boundary-title">Something went wrong</h2>

            <p className="error-boundary-message">
              We're sorry for the inconvenience. This error has been logged and we'll look into it.
            </p>

            <div className="error-boundary-actions">
              <button
                onClick={this.resetError}
                className="btn-secondary"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Refresh Page
              </button>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>Error Details (Dev Only)</summary>
                <div className="error-boundary-stack">
                  <p><strong>Error:</strong> {this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              </details>
            )}
          </div>

          <style>{`
            .error-boundary {
              min-height: 400px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
              background: var(--sand-50, #faf9f7);
            }

            .error-boundary-content {
              max-width: 500px;
              text-align: center;
            }

            .error-boundary-icon {
              color: var(--terracotta-500, #d97706);
              margin: 0 auto 1.5rem;
              width: 48px;
              height: 48px;
            }

            .error-boundary-title {
              font-family: var(--font-serif, serif);
              font-size: 1.75rem;
              font-weight: 600;
              color: var(--earth-800, #1f2937);
              margin: 0 0 0.75rem;
            }

            .error-boundary-message {
              font-size: 1rem;
              color: var(--earth-600, #4b5563);
              margin: 0 0 2rem;
              line-height: 1.6;
            }

            .error-boundary-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
            }

            .error-boundary-details {
              margin-top: 2rem;
              text-align: left;
              padding: 1rem;
              background: white;
              border-radius: 8px;
              border: 1px solid var(--sand-200, #e5e7eb);
            }

            .error-boundary-details summary {
              cursor: pointer;
              font-weight: 600;
              color: var(--earth-700, #374151);
              margin-bottom: 0.5rem;
            }

            .error-boundary-stack {
              font-size: 0.875rem;
              color: var(--earth-600, #4b5563);
            }

            .error-boundary-stack pre {
              margin-top: 0.5rem;
              padding: 0.75rem;
              background: var(--sand-100, #f3f4f6);
              border-radius: 4px;
              overflow-x: auto;
              font-size: 0.75rem;
              line-height: 1.4;
            }

            @media (max-width: 640px) {
              .error-boundary {
                padding: 1.5rem;
              }

              .error-boundary-title {
                font-size: 1.5rem;
              }

              .error-boundary-actions {
                flex-direction: column;
              }

              .error-boundary-actions button {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component wrapper for functional components
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
