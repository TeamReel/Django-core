import { render, screen, fireEvent } from '@testing-library/react';
import { WizardProvider, useWizard, type WizardStepConfig } from './WizardContext';

const steps: WizardStepConfig[] = [
  { id: 'step-1', title: 'Step One' },
  { id: 'step-2', title: 'Step Two' },
  { id: 'step-3', title: 'Step Three' },
];

function TestConsumer() {
  const w = useWizard();
  return (
    <div>
      <span data-testid="current">{w.currentStepId}</span>
      <span data-testid="index">{w.currentStepIndex}</span>
      <span data-testid="first">{String(w.isFirstStep)}</span>
      <span data-testid="last">{String(w.isLastStep)}</span>
      <span data-testid="progress">{Math.round(w.progress)}</span>
      <button onClick={w.next}>Next</button>
      <button onClick={w.back}>Back</button>
      <button onClick={w.complete}>Complete</button>
      <button onClick={w.reset}>Reset</button>
      <button onClick={() => w.setData('foo', 'bar')}>Set Data</button>
      <span data-testid="data-foo">{String(w.data.foo ?? '')}</span>
    </div>
  );
}

describe('WizardContext', () => {
  const onClose = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard() {
    return render(
      <WizardProvider steps={steps} onClose={onClose} onComplete={onComplete}>
        <TestConsumer />
      </WizardProvider>
    );
  }

  it('starts at first step', () => {
    renderWizard();
    expect(screen.getByTestId('current')).toHaveTextContent('step-1');
    expect(screen.getByTestId('first')).toHaveTextContent('true');
    expect(screen.getByTestId('last')).toHaveTextContent('false');
  });

  it('navigates to next step', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByTestId('current')).toHaveTextContent('step-2');
    expect(screen.getByTestId('index')).toHaveTextContent('1');
  });

  it('navigates back', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('current')).toHaveTextContent('step-1');
  });

  it('does not go before first step', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('current')).toHaveTextContent('step-1');
  });

  it('does not go past last step via next', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next')); // past end
    expect(screen.getByTestId('current')).toHaveTextContent('step-3');
  });

  it('calculates progress correctly', () => {
    renderWizard();
    expect(screen.getByTestId('progress')).toHaveTextContent('0');
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByTestId('progress')).toHaveTextContent('50');
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByTestId('progress')).toHaveTextContent('100');
  });

  it('completes last step and calls onComplete', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Complete'));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('complete on non-last step advances to next', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Complete'));
    expect(screen.getByTestId('current')).toHaveTextContent('step-2');
  });

  it('setData stores data', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Set Data'));
    expect(screen.getByTestId('data-foo')).toHaveTextContent('bar');
  });

  it('reset returns to initial state', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Set Data'));
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByTestId('current')).toHaveTextContent('step-1');
    expect(screen.getByTestId('data-foo')).toHaveTextContent('');
  });

  it('throws when useWizard is used outside provider', () => {
    function Bad() {
      useWizard();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useWizard must be used within a WizardProvider');
  });
});
