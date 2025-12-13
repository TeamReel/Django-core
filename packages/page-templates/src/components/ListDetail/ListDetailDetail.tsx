import * as React from 'react';
import type { ListDetailDetailProps } from '../../types';
import { useListDetailContext } from './ListDetail';
import { DefaultLoading } from '../states/DefaultLoading';

/**
 * Detail panel for List-Detail template
 *
 * Displays detail content with optional back button (mobile) and loading state
 */
export const ListDetailDetail: React.FC<ListDetailDetailProps> = ({
  children,
  showBackButton = true,
  onBack,
  loading = false,
  className,
  'aria-label': ariaLabel = 'Detail',
  ...props
}) => {
  const context = useListDetailContext();

  const handleBack = React.useCallback(() => {
    if (context.mobileLayout === 'overlay') {
      context.setShowDetail(false);
      context.setSelectedId(null);
    }
    onBack?.();
  }, [context, onBack]);

  // Show back button only on mobile when showBackButton=true
  const shouldShowBackButton =
    showBackButton && context.isMobile && context.mobileLayout === 'overlay';

  // Loading state
  if (loading) {
    return (
      <article className={className} aria-label={ariaLabel} {...props}>
        {shouldShowBackButton && (
          <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0' }}>
            <button
              onClick={handleBack}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
              aria-label="Back to list"
            >
              ← Back
            </button>
          </div>
        )}
        <div style={{ padding: '2rem' }}>
          <DefaultLoading />
        </div>
      </article>
    );
  }

  return (
    <article className={className} aria-label={ariaLabel} {...props}>
      {shouldShowBackButton && (
        <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0' }}>
          <button
            onClick={handleBack}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer',
            }}
            aria-label="Back to list"
          >
            ← Back
          </button>
        </div>
      )}
      <div style={{ padding: '1rem' }}>{children}</div>
    </article>
  );
};

ListDetailDetail.displayName = 'ListDetail.Detail';
