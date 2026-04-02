import { render, screen, fireEvent, act } from '@testing-library/react';
import OnboardingWizard, { resetOnboarding, isOnboardingCompleted } from './OnboardingWizard';

// Mock BottomSheet from design system (used by WizardShell internally)
vi.mock('@django-core/design-system', () => ({
  BottomSheet: ({ isOpen, onClose, children, footer }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) =>
    isOpen ? <div data-testid="bottom-sheet">{children}{footer}</div> : null,
  Button: ({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}));

describe('OnboardingWizard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows first step when forceShow is true', () => {
    render(<OnboardingWizard forceShow />);
    expect(screen.getByText('Welkom bij TeamReel!')).toBeInTheDocument();
  });

  it('shows first step description', () => {
    render(<OnboardingWizard forceShow />);
    expect(screen.getByText(/Genereer in een paar taps/)).toBeInTheDocument();
  });

  it('navigates to next step', () => {
    render(<OnboardingWizard forceShow />);
    fireEvent.click(screen.getByText('Volgende'));
    expect(screen.getByText('Quick Create')).toBeInTheDocument();
  });

  it('navigates back', () => {
    render(<OnboardingWizard forceShow />);
    // Go to step 2
    fireEvent.click(screen.getByText('Volgende'));
    expect(screen.getByText('Quick Create')).toBeInTheDocument();
    // Go back
    fireEvent.click(screen.getByText('Terug'));
    expect(screen.getByText('Welkom bij TeamReel!')).toBeInTheDocument();
  });

  it('shows "Aan de slag!" on last step', () => {
    render(<OnboardingWizard forceShow />);
    // Navigate to last step (4 total)
    fireEvent.click(screen.getByText('Volgende')); // step 2
    fireEvent.click(screen.getByText('Volgende')); // step 3
    fireEvent.click(screen.getByText('Volgende')); // step 4 (last)
    expect(screen.getByText('Aan de slag!')).toBeInTheDocument();
  });

  it('calls onComplete and sets localStorage on final step', () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard forceShow onComplete={onComplete} />);
    // Navigate to last step and click finish
    fireEvent.click(screen.getByText('Volgende'));
    fireEvent.click(screen.getByText('Volgende'));
    fireEvent.click(screen.getByText('Volgende'));
    fireEvent.click(screen.getByText('Aan de slag!'));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(localStorage.getItem('teamreel:onboarding_completed')).toBe('true');
  });

  it('skip button closes wizard and sets localStorage', () => {
    const onComplete = vi.fn();
    render(<OnboardingWizard forceShow onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Overslaan'));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(localStorage.getItem('teamreel:onboarding_completed')).toBe('true');
  });

  it('close button has correct aria-label', () => {
    render(<OnboardingWizard forceShow />);
    expect(screen.getByLabelText('Sluiten')).toBeInTheDocument();
  });

  it('opens automatically after delay when not completed', () => {
    render(<OnboardingWizard />);
    // Before timeout → not open
    expect(screen.queryByText('Welkom bij TeamReel!')).not.toBeInTheDocument();
    // After 1s timeout
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('Welkom bij TeamReel!')).toBeInTheDocument();
  });

  it('does not open when already completed', () => {
    localStorage.setItem('teamreel:onboarding_completed', 'true');
    render(<OnboardingWizard />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByText('Welkom bij TeamReel!')).not.toBeInTheDocument();
  });

  it('resetOnboarding removes the flag', () => {
    localStorage.setItem('teamreel:onboarding_completed', 'true');
    resetOnboarding();
    expect(localStorage.getItem('teamreel:onboarding_completed')).toBeNull();
  });

  it('isOnboardingCompleted returns correct state', () => {
    expect(isOnboardingCompleted()).toBe(false);
    localStorage.setItem('teamreel:onboarding_completed', 'true');
    expect(isOnboardingCompleted()).toBe(true);
  });

  it('shows progress bar', () => {
    render(<OnboardingWizard forceShow />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
