import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Wizard } from './Wizard';
import type { WizardStepConfig } from '../../types';

const mockSteps: WizardStepConfig[] = [
  { id: 'step1', label: 'Step 1' },
  { id: 'step2', label: 'Step 2' },
  { id: 'step3', label: 'Step 3' },
];

describe('Wizard', () => {
  describe('Basic Rendering', () => {
    it('renders wizard with children', () => {
      render(
        <Wizard steps={mockSteps}>
          <Wizard.Step stepId="step1">
            <div>Step 1 Content</div>
          </Wizard.Step>
          <Wizard.Step stepId="step2">
            <div>Step 2 Content</div>
          </Wizard.Step>
          <Wizard.Step stepId="step3">
            <div>Step 3 Content</div>
          </Wizard.Step>
        </Wizard>
      );

      expect(screen.getByText('Step 1 Content')).toBeInTheDocument();
      expect(screen.queryByText('Step 2 Content')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <Wizard steps={mockSteps} className="custom-wizard">
          <Wizard.Step stepId="step1">Content</Wizard.Step>
        </Wizard>
      );

      expect(container.firstChild).toHaveClass('custom-wizard');
    });

    it('applies custom aria-label', () => {
      render(
        <Wizard steps={mockSteps} aria-label="Custom Wizard">
          <Wizard.Step stepId="step1">Content</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByLabelText('Custom Wizard')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('navigates forward through steps', () => {
      render(
        <Wizard steps={mockSteps}>
          <Wizard.Step stepId="step1">Step 1 Content</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2 Content</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3 Content</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByText('Step 1 Content')).toBeInTheDocument();

      const nextButton = screen.getByLabelText('Next');
      fireEvent.click(nextButton);

      expect(screen.queryByText('Step 1 Content')).not.toBeInTheDocument();
      expect(screen.getByText('Step 2 Content')).toBeInTheDocument();
    });

    it('navigates backward through steps', () => {
      render(
        <Wizard steps={mockSteps} defaultStepIndex={1}>
          <Wizard.Step stepId="step1">Step 1 Content</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2 Content</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3 Content</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByText('Step 2 Content')).toBeInTheDocument();

      const previousButton = screen.getByLabelText('Previous');
      fireEvent.click(previousButton);

      expect(screen.getByText('Step 1 Content')).toBeInTheDocument();
    });

    it('disables Previous button on first step', () => {
      render(
        <Wizard steps={mockSteps}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
        </Wizard>
      );

      const previousButton = screen.getByLabelText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('shows Finish button on last step', () => {
      render(
        <Wizard steps={mockSteps} defaultStepIndex={2}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByLabelText('Finish')).toBeInTheDocument();
      expect(screen.queryByLabelText('Next')).not.toBeInTheDocument();
    });
  });

  describe('Controlled State', () => {
    it('supports controlled stepIndex', () => {
      const handleChange = vi.fn();

      const { rerender } = render(
        <Wizard steps={mockSteps} stepIndex={0} onStepIndexChange={handleChange}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3</Wizard.Step>
        </Wizard>
      );

      const nextButton = screen.getByLabelText('Next');
      fireEvent.click(nextButton);

      expect(handleChange).toHaveBeenCalledWith(1);

      rerender(
        <Wizard steps={mockSteps} stepIndex={1} onStepIndexChange={handleChange}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    it('supports uncontrolled with defaultStepIndex', () => {
      render(
        <Wizard steps={mockSteps} defaultStepIndex={1}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onComplete when Finish is clicked', () => {
      const handleComplete = vi.fn();

      render(
        <Wizard steps={mockSteps} defaultStepIndex={2} onComplete={handleComplete}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3</Wizard.Step>
        </Wizard>
      );

      const finishButton = screen.getByLabelText('Finish');
      fireEvent.click(finishButton);

      expect(handleComplete).toHaveBeenCalled();
    });

    it('calls onCancel when Cancel is clicked', () => {
      const handleCancel = vi.fn();

      render(
        <Wizard steps={mockSteps} onCancel={handleCancel}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
        </Wizard>
      );

      const cancelButton = screen.getByLabelText('Cancel');
      fireEvent.click(cancelButton);

      expect(handleCancel).toHaveBeenCalled();
    });
  });

  describe('Step Indicator', () => {
    it('shows step indicator by default', () => {
      render(
        <Wizard steps={mockSteps}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByRole('navigation', { name: 'Wizard progress' })).toBeInTheDocument();
    });

    it('hides step indicator when showStepIndicator=false', () => {
      render(
        <Wizard steps={mockSteps} showStepIndicator={false}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
        </Wizard>
      );

      expect(screen.queryByRole('navigation', { name: 'Wizard progress' })).not.toBeInTheDocument();
    });

    it('supports different indicator variants', () => {
      const { rerender } = render(
        <Wizard steps={mockSteps} stepIndicatorVariant="dots">
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByRole('navigation', { name: 'Wizard progress' })).toBeInTheDocument();

      rerender(
        <Wizard steps={mockSteps} stepIndicatorVariant="numbers">
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByRole('navigation', { name: 'Wizard progress' })).toBeInTheDocument();

      rerender(
        <Wizard steps={mockSteps} stepIndicatorVariant="labels">
          <Wizard.Step stepId="step1">Step 1 Content</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2 Content</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3 Content</Wizard.Step>
        </Wizard>
      );

      // Verify step indicators show all labels
      expect(screen.getByLabelText(/Step 1.*current/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Step 2.*upcoming/)).toBeInTheDocument();
    });
  });

  describe('Step Bounds Validation', () => {
    it('clamps step index to valid range', () => {
      const { rerender } = render(
        <Wizard steps={mockSteps} stepIndex={-1}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByText('Step 1')).toBeInTheDocument();

      rerender(
        <Wizard steps={mockSteps} stepIndex={10}>
          <Wizard.Step stepId="step1">Step 1</Wizard.Step>
          <Wizard.Step stepId="step2">Step 2</Wizard.Step>
          <Wizard.Step stepId="step3">Step 3</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });
  });

  describe('Compound Components', () => {
    it('attaches Step sub-component', () => {
      expect(Wizard.Step).toBeDefined();
      expect(Wizard.Step.displayName).toBe('Wizard.Step');
    });

    it('attaches Navigation sub-component', () => {
      expect(Wizard.Navigation).toBeDefined();
      expect(Wizard.Navigation.displayName).toBe('Wizard.Navigation');
    });
  });
});

describe('WizardStep', () => {
  it('renders only when active', () => {
    render(
      <Wizard steps={mockSteps}>
        <Wizard.Step stepId="step1">Step 1 Active</Wizard.Step>
        <Wizard.Step stepId="step2">Step 2 Inactive</Wizard.Step>
      </Wizard>
    );

    expect(screen.getByText('Step 1 Active')).toBeInTheDocument();
    expect(screen.queryByText('Step 2 Inactive')).not.toBeInTheDocument();
  });
});

describe('WizardNavigation', () => {
  it('disables buttons based on state', () => {
    render(
      <Wizard steps={mockSteps}>
        <Wizard.Step stepId="step1">Step 1</Wizard.Step>
      </Wizard>
    );

    expect(screen.getByLabelText('Previous')).toBeDisabled();
    expect(screen.getByLabelText('Next')).not.toBeDisabled();
  });

  it('shows loading state during async operations', async () => {
    const handleComplete = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(
      <Wizard steps={mockSteps} defaultStepIndex={2} onComplete={handleComplete}>
        <Wizard.Step stepId="step1">Step 1</Wizard.Step>
        <Wizard.Step stepId="step2">Step 2</Wizard.Step>
        <Wizard.Step stepId="step3">Step 3</Wizard.Step>
      </Wizard>
    );

    const finishButton = screen.getByLabelText('Finish');
    fireEvent.click(finishButton);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
