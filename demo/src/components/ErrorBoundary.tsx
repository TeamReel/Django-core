import { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  location?: { pathname: string };
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary catches React errors in child components and displays a friendly fallback UI.
 * This prevents the entire app from crashing when a component throws an error.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // In production, you would send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.location?.pathname !== prevProps.location?.pathname) {
      if (this.state.hasError) {
        this.handleReset();
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-col" style={{
          minHeight: '100vh',
          backgroundColor: '#f8f9fa'
        }}>
          <div className="max-w-800 mx-auto" style={{
            padding: '60px 20px'
          }}>
            <div className="text-center" style={{ marginBottom: '40px' }}>
              <div className="mb-24" style={{ fontSize: '72px' }}>⚠️</div>

              <h1 className="mb-16" style={{ fontSize: '48px', color: 'var(--app-error)' }}>
                500
              </h1>

              <h2 className="fs-24 mb-24" style={{ color: '#333' }}>
                Something went wrong
              </h2>

              <p className="fs-16 mb-32" style={{ color: '#666' }}>
                We're sorry, but something unexpected happened.
                The error has been logged and we'll look into it.
              </p>

              <div className="flex-center gap-12">
                <button
                  onClick={this.handleReset}
                  className="py-12 px-24 border-none rounded-4 fs-16 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--app-primary)',
                    color: 'white',
                  }}
                >
                  Try Again
                </button>

                <Link
                  to="/dashboard"
                  className="inline-block py-12 px-24 rounded-4 fs-16"
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    textDecoration: 'none',
                  }}
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <div className="p-20 rounded-8 text-left" style={{
                marginTop: '48px',
                backgroundColor: '#f8f9fa',
              }}>
                <h3 className="fs-18" style={{ marginTop: 0, color: 'var(--app-error)' }}>
                  Error Details (Development Only)
                </h3>

                <div className="mt-16 p-16 rounded-4 fs-14 overflow-x-auto" style={{
                  backgroundColor: '#fff',
                  border: '1px solid #dee2e6',
                  fontFamily: 'monospace',
                }}>
                  <div className="mb-12">
                    <strong>Error:</strong>
                    <pre style={{
                      margin: '8px 0 0 0',
                      whiteSpace: 'pre-wrap',
                      color: 'var(--app-error)'
                    }}>
                      {this.state.error.toString()}
                    </pre>
                  </div>

                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="fs-12" style={{
                        margin: '8px 0 0 0',
                        whiteSpace: 'pre-wrap',
                        color: '#666',
                      }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-20 rounded-8 text-left" style={{
              marginTop: '48px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
            }}>
              <h3 className="fs-18" style={{ marginTop: 0 }}>What to do:</h3>
              <ul style={{ color: '#666', lineHeight: '1.8' }}>
                <li>Click "Try Again" to reload the page</li>
                <li>Return to the dashboard and try a different action</li>
                <li>If the problem persists, contact support</li>
                <li>Try refreshing your browser (Ctrl+R or Cmd+R)</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
