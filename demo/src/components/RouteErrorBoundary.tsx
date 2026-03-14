/**
 * RouteErrorBoundary — Error boundary for Data Router routes
 *
 * Used as errorElement in route configuration.
 * Provides user-friendly error display with recovery options.
 *
 * @see https://reactrouter.com/en/main/route/error-element
 */
import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { routes } from '../routes';
import { logger } from '../utils/logger';

interface RouteErrorBoundaryProps {
  /** Optional title override */
  title?: string;
}

/** Format error details for dev mode display */
function formatErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n\n${error.stack ?? ''}`;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export default function RouteErrorBoundary({ title }: RouteErrorBoundaryProps): React.JSX.Element {
  const error = useRouteError();
  const navigate = useNavigate();

  // Log the error
  React.useEffect(() => {
    logger.error('Route error boundary caught error:', error);
  }, [error]);

  // Handle different error types
  let errorMessage = 'Something went wrong';
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    // Router error response (404, 403, etc.)
    errorStatus = error.status;
    errorMessage = error.statusText || getStatusMessage(error.status);
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Compute a string-typed display title
  const displayTitle: string = title ?? (errorStatus !== undefined ? getStatusTitle(errorStatus) : 'Error');

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate(routes.dashboard());
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary p-4">
      <div className="max-w-md w-full text-center">
        {/* Error icon */}
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-accent-red-base"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error status */}
        {errorStatus !== undefined && (
          <p className="text-6xl font-bold text-text-primary mb-2">
            {errorStatus}
          </p>
        )}

        {/* Title */}
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          {displayTitle}
        </h1>

        {/* Message */}
        <p className="text-text-secondary mb-8">
          {errorMessage}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleGoBack}
            className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleGoHome}
            className="px-4 py-2 text-sm font-medium text-text-inverse bg-accent-primary hover:bg-accent-primary-dark rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={handleReload}
            className="px-4 py-2 text-sm font-medium text-text-secondary bg-surface-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>

        {/* Dev mode: show full error */}
        {import.meta.env.DEV && error !== null && error !== undefined && (
          <details className="mt-8 text-left">
            <summary className="text-sm text-text-tertiary cursor-pointer hover:text-text-secondary">
              Show error details
            </summary>
            <pre className="mt-2 p-4 bg-surface-secondary rounded-lg text-xs text-text-secondary overflow-auto max-h-64">
              {formatErrorDetails(error)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function getStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid.';
    case 401:
      return 'You need to be logged in to access this page.';
    case 403:
      return "You don't have permission to access this page.";
    case 404:
      return 'The page you are looking for could not be found.';
    case 500:
      return 'The server encountered an error. Please try again later.';
    default:
      return 'An unexpected error occurred.';
  }
}

function getStatusTitle(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Page Not Found';
    case 500:
      return 'Server Error';
    default:
      return 'Error';
  }
}
