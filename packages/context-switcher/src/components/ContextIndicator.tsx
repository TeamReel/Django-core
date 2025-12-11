import React from 'react';
import { Text, Spinner, Alert } from '@django-core/design-system';
import { useContextSwitcher } from '../hooks/useContextSwitcher';

export interface ContextIndicatorProps {
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * ContextIndicator displays the current organisation and project context.
 * Shows loading and error states gracefully.
 *
 * Requirements:
 * - FR-001: Always-visible context indicator
 * - FR-002: Shows current organisation name
 * - FR-003: Shows current project name (when applicable)
 * - WCAG 2.1 AA accessible with ARIA labels
 */
export function ContextIndicator({ className }: ContextIndicatorProps): React.ReactElement {
  const { context, refresh } = useContextSwitcher();

  // Handler for retry button
  const handleRetry = (): void => {
    refresh().catch((err) => {
      console.error('Failed to refresh context:', err);
    });
  };

  // Loading state - show spinner
  if (context.isLoading) {
    return (
      <div
        className={className}
        role="status"
        aria-live="polite"
        aria-label="Loading context information"
      >
        <Spinner size="sm" />
      </div>
    );
  }

  // Error state - show alert with retry
  if (context.error) {
    return (
      <div className={className}>
        <Alert variant="error">
          {context.error.message}
          <button
            onClick={handleRetry}
            style={{
              marginLeft: '8px',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  // No context available
  if (!context.organisation) {
    return (
      <div
        className={className}
        role="status"
        aria-live="polite"
        aria-label="No context selected"
      >
        <Text size="sm" color="tertiary">
          No context
        </Text>
      </div>
    );
  }

  // Build accessible label
  const ariaLabel = context.project
    ? `Currently in ${context.organisation.name}, ${context.project.name} project`
    : `Currently in ${context.organisation.name}`;

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <Text
        as="span"
        size="md"
        weight="medium"
        style={{
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
        title={context.organisation.name}
      >
        {context.organisation.name}
      </Text>

      {context.project && (
        <>
          <Text as="span" size="md" color="tertiary" style={{ margin: '0 4px' }}>
            /
          </Text>
          <Text
            as="span"
            size="md"
            weight="normal"
            style={{
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              verticalAlign: 'middle',
            }}
            title={context.project.name}
          >
            {context.project.name}
          </Text>
        </>
      )}
    </div>
  );
}
