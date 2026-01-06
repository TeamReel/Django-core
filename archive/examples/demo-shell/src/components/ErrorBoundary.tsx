import { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AppShell from './AppShell';

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
        <AppShell>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '60px 20px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '72px', marginBottom: '24px' }}>⚠️</div>

              <h1 style={{ fontSize: '48px', marginBottom: '16px', color: '#dc3545' }}>
                500
              </h1>

              <h2 style={{ fontSize: '24px', marginBottom: '24px', color: '#333' }}>
                Something went wrong
              </h2>

              <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
                We're sorry, but something unexpected happened.
                The error has been logged and we'll look into it.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={this.handleReset}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>

                <Link
                  to="/dashboard"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <div style={{
                marginTop: '48px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'left'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '18px', color: '#dc3545' }}>
                  Error Details (Development Only)
                </h3>

                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  overflowX: 'auto'
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <strong>Error:</strong>
                    <pre style={{
                      margin: '8px 0 0 0',
                      whiteSpace: 'pre-wrap',
                      color: '#dc3545'
                    }}>
                      {this.state.error.toString()}
                    </pre>
                  </div>

                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre style={{
                        margin: '8px 0 0 0',
                        whiteSpace: 'pre-wrap',
                        color: '#666',
                        fontSize: '12px'
                      }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{
              marginTop: '48px',
              padding: '20px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <h3 style={{ marginTop: 0, fontSize: '18px' }}>What to do:</h3>
              <ul style={{ color: '#666', lineHeight: '1.8' }}>
                <li>Click "Try Again" to reload the page</li>
                <li>Return to the dashboard and try a different action</li>
                <li>If the problem persists, contact support</li>
                <li>Try refreshing your browser (Ctrl+R or Cmd+R)</li>
              </ul>
            </div>
          </div>
        </AppShell>
      );
    }

    return this.props.children;
  }
}
