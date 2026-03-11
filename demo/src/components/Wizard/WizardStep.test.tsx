import { render, screen } from '@testing-library/react';
import { WizardStep } from './WizardStep';
import { WizardProvider, type WizardStepConfig } from './WizardContext';

const steps: WizardStepConfig[] = [
  { id: 'a', title: 'Step A' },
  { id: 'b', title: 'Step B' },
];

function renderWithWizard(activeStep: string) {
  return render(
    <WizardProvider steps={steps} initialStepId={activeStep} onClose={vi.fn()}>
      <WizardStep stepId="a">
        <div>Content A</div>
      </WizardStep>
      <WizardStep stepId="b">
        <div>Content B</div>
      </WizardStep>
    </WizardProvider>
  );
}

describe('WizardStep', () => {
  it('renders children when step is active', () => {
    renderWithWizard('a');
    expect(screen.getByText('Content A')).toBeInTheDocument();
  });

  it('does not render inactive step', () => {
    renderWithWizard('a');
    expect(screen.queryByText('Content B')).not.toBeInTheDocument();
  });

  it('renders step B when it is active', () => {
    renderWithWizard('b');
    expect(screen.getByText('Content B')).toBeInTheDocument();
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });
});
