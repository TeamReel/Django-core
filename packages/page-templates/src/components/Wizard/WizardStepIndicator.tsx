import * as React from 'react';
import type { WizardStepConfig } from '../../types';

export interface WizardStepIndicatorProps {
  steps: WizardStepConfig[];
  currentStepIndex: number;
  variant: 'dots' | 'numbers' | 'labels';
  className?: string;
}

/**
 * Wizard step indicator showing progress through steps
 *
 * Supports three variants: dots, numbers, labels
 */
export const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  steps,
  currentStepIndex,
  variant,
  className,
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: variant === 'labels' ? '0' : '0.5rem',
    padding: '1rem',
    borderBottom: '1px solid #e0e0e0',
  };

  const getStepState = (index: number): 'completed' | 'current' | 'upcoming' => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const renderDots = () => {
    return steps.map((step, index) => {
      const state = getStepState(index);
      const dotStyle: React.CSSProperties = {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor:
          state === 'completed'
            ? '#4caf50'
            : state === 'current'
            ? '#2196f3'
            : '#e0e0e0',
        transition: 'background-color 0.2s',
      };

      return (
        <div
          key={step.id}
          style={dotStyle}
          role="img"
          aria-label={`${step.label}: ${state}`}
          aria-current={state === 'current' ? 'step' : undefined}
        />
      );
    });
  };

  const renderNumbers = () => {
    return steps.map((step, index) => {
      const state = getStepState(index);
      const numberStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '2px solid',
        borderColor:
          state === 'completed'
            ? '#4caf50'
            : state === 'current'
            ? '#2196f3'
            : '#e0e0e0',
        backgroundColor:
          state === 'completed'
            ? '#4caf50'
            : state === 'current'
            ? '#2196f3'
            : 'white',
        color: state === 'upcoming' ? '#666' : 'white',
        fontWeight: state === 'current' ? 600 : 400,
        fontSize: '14px',
        transition: 'all 0.2s',
      };

      return (
        <div
          key={step.id}
          style={numberStyle}
          role="img"
          aria-label={`Step ${index + 1}: ${step.label} (${state})`}
          aria-current={state === 'current' ? 'step' : undefined}
        >
          {state === 'completed' ? '✓' : index + 1}
        </div>
      );
    });
  };

  const renderLabels = () => {
    return steps.map((step, index) => {
      const state = getStepState(index);
      const isLast = index === steps.length - 1;

      const labelContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        flex: 1,
      };

      const labelStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        padding: '0 0.5rem',
      };

      const labelTextStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: state === 'current' ? 600 : 400,
        color:
          state === 'completed'
            ? '#4caf50'
            : state === 'current'
            ? '#2196f3'
            : '#999',
        marginTop: '0.5rem',
        textAlign: 'center',
      };

      const connectorStyle: React.CSSProperties = {
        flex: 1,
        height: '2px',
        backgroundColor: state === 'completed' ? '#4caf50' : '#e0e0e0',
        transition: 'background-color 0.2s',
      };

      return (
        <div key={step.id} style={labelContainerStyle}>
          <div style={labelStyle}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid',
                borderColor:
                  state === 'completed'
                    ? '#4caf50'
                    : state === 'current'
                    ? '#2196f3'
                    : '#e0e0e0',
                backgroundColor:
                  state === 'completed'
                    ? '#4caf50'
                    : state === 'current'
                    ? '#2196f3'
                    : 'white',
                color: state === 'upcoming' ? '#666' : 'white',
                fontSize: '12px',
                fontWeight: 600,
              }}
              role="img"
              aria-label={`Step ${index + 1}: ${step.label} (${state})`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'completed' ? '✓' : index + 1}
            </div>
            <div style={labelTextStyle}>{step.label}</div>
          </div>
          {!isLast && <div style={connectorStyle} />}
        </div>
      );
    });
  };

  return (
    <div
      className={className}
      style={containerStyle}
      role="navigation"
      aria-label="Wizard progress"
    >
      {variant === 'dots' && renderDots()}
      {variant === 'numbers' && renderNumbers()}
      {variant === 'labels' && renderLabels()}
    </div>
  );
};

WizardStepIndicator.displayName = 'WizardStepIndicator';
