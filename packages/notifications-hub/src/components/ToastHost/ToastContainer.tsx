import React from 'react';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastContainerProps {
  position: ToastPosition;
  children: React.ReactNode;
}

/**
 * Positioning wrapper for toast notifications.
 * Handles absolute positioning based on the specified position prop.
 * Responsive: adjusts positioning for mobile vs desktop.
 *
 * @example
 * ```tsx
 * <ToastContainer position="top-right">
 *   <Toast notification={notification} onDismiss={handleDismiss} />
 * </ToastContainer>
 * ```
 */
export function ToastContainer({ position, children }: ToastContainerProps) {
  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: 'none',
    };

    // Desktop positioning
    const positionMap: Record<ToastPosition, React.CSSProperties> = {
      'top-right': {
        top: '16px',
        right: '16px',
      },
      'top-left': {
        top: '16px',
        left: '16px',
      },
      'top-center': {
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
      },
      'bottom-right': {
        bottom: '16px',
        right: '16px',
      },
      'bottom-left': {
        bottom: '16px',
        left: '16px',
      },
      'bottom-center': {
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
      },
    };

    return {
      ...baseStyles,
      ...positionMap[position],
    };
  };

  const containerStyle: React.CSSProperties = {
    ...getPositionStyles(),
  };

  // Mobile responsive override
  const mobileMediaQuery = '@media (max-width: 768px)';

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .toast-container {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
          }
          .toast-container[data-position^="top"] {
            top: 16px !important;
          }
          .toast-container[data-position^="bottom"] {
            bottom: 16px !important;
          }
        }
      `}</style>
      <div
        className="toast-container"
        data-position={position}
        style={containerStyle}
        aria-live="polite"
        aria-atomic="false"
      >
        {children}
      </div>
    </>
  );
}
