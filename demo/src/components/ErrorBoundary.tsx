import { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './ErrorBoundary.module.css';

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

    // Detect chunk / dynamic-import failures and auto-reload once
    if (this.isChunkLoadError(error)) {
      const key = 'teamreel-chunk-reload';
      const lastReload = sessionStorage.getItem(key);
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10_000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(key);
    }
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

  handleReload = () => {
    window.location.reload();
  };

  isChunkLoadError(error: Error): boolean {
    const msg = error.message || '';
    return (
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Loading CSS chunk') ||
      msg.includes('error loading dynamically imported module')
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`flex-col ${styles.root}`}>
          <div className={`max-w-800 mx-auto ${styles.content}`}>
            <div className={`text-center ${styles.header}`}>
              <div className={`mb-24 ${styles.icon}`}>⚠️</div>

              <h1 className={`mb-16 text-error ${styles.statusCode}`}>
                500
              </h1>

              <h2 className="fs-24 mb-24 text-primary">
                {this.state.error && this.isChunkLoadError(this.state.error)
                  ? 'App updated — reload needed'
                  : 'Something went wrong'}
              </h2>

              <p className="fs-16 mb-32 text-secondary">
                {this.state.error && this.isChunkLoadError(this.state.error)
                  ? 'A new version was deployed. Click Reload to get the latest version.'
                  : "We're sorry, but something unexpected happened. The error has been logged and we'll look into it."}
              </p>

              <div className="flex-center gap-12">
                <button
                  onClick={this.handleReload}
                  className={`py-12 px-24 border-none rounded-4 fs-16 cursor-pointer text-white ${styles.tryAgainButton}`}
                >
                  Reload
                </button>

                <Link
                  to="/dashboard"
                  className={`inline-block py-12 px-24 rounded-4 fs-16 text-white text-decoration-none ${styles.dashboardLink}`}
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <div className={`p-20 rounded-8 text-left ${styles.detailsSection}`}>
                <h3 className="fs-18 mt-0 text-error">
                  Error Details (Development Only)
                </h3>

                <div className={`mt-16 p-16 rounded-4 fs-14 overflow-x-auto border ${styles.detailsInner}`}>
                  <div className="mb-12">
                    <strong>Error:</strong>
                      <pre className={`text-error ${styles.preBlock}`}>
                      {this.state.error.toString()}
                    </pre>
                  </div>

                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                        <pre className={`fs-12 text-secondary ${styles.preBlock}`}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={`p-20 rounded-8 text-left ${styles.helpSection}`}>
              <h3 className="fs-18 mt-0">What to do:</h3>
              <ul className={`text-secondary ${styles.helpList}`}>
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
