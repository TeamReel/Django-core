import * as React from 'react';
import type { WizardNavigationProps } from '../../types';

/**
 * Wizard navigation controls
 *
 * Renders Previous, Next/Finish, and Cancel buttons with appropriate state
 */
export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  canGoPrevious,
  isLastStep,
  onPrevious,
  onNext,
  onCancel,
  onFinish,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  cancelLabel = 'Cancel',
  finishLabel = 'Finish',
  className,
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleNext = async () => {
    setLoading(true);
    try {
      if (isLastStep) {
        await onFinish();
      } else {
        await onNext();
      }
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    borderTop: '1px solid #e0e0e0',
    gap: '1rem',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.5rem 1.5rem',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f5f5f5',
    color: '#999',
    cursor: 'not-allowed',
  };

  return (
    <div className={className} style={containerStyle} role="navigation" aria-label="Wizard navigation">
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {/* Cancel Button */}
        <button
          onClick={onCancel}
          style={buttonStyle}
          type="button"
          disabled={loading}
          aria-label={cancelLabel}
        >
          {cancelLabel}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          style={canGoPrevious && !loading ? buttonStyle : disabledButtonStyle}
          type="button"
          disabled={!canGoPrevious || loading}
          aria-label={previousLabel}
        >
          {previousLabel}
        </button>

        {/* Next/Finish Button */}
        <button
          onClick={handleNext}
          style={loading ? disabledButtonStyle : primaryButtonStyle}
          type="button"
          disabled={loading}
          aria-label={isLastStep ? finishLabel : nextLabel}
        >
          {loading ? 'Processing...' : isLastStep ? finishLabel : nextLabel}
        </button>
      </div>
    </div>
  );
};

WizardNavigation.displayName = 'Wizard.Navigation';
