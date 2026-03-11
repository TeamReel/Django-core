import { render, screen, fireEvent } from '@testing-library/react';
import { WizardFooterPrimary, WizardFooterDual, WizardFooterSubmit } from './WizardFooter';
import { WizardProvider, type WizardStepConfig } from './WizardContext';

const steps: WizardStepConfig[] = [
  { id: 'a', title: 'Step A' },
  { id: 'b', title: 'Step B' },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <WizardProvider steps={steps} onClose={vi.fn()}>
      {children}
    </WizardProvider>
  );
}

describe('WizardFooterPrimary', () => {
  it('renders with default label', () => {
    render(<Wrapper><WizardFooterPrimary /></Wrapper>);
    expect(screen.getByText('Verder')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<Wrapper><WizardFooterPrimary label="Continue" /></Wrapper>);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('calls custom onClick when provided', () => {
    const onClick = vi.fn();
    render(<Wrapper><WizardFooterPrimary onClick={onClick} /></Wrapper>);
    fireEvent.click(screen.getByText('Verder'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Wrapper><WizardFooterPrimary disabled /></Wrapper>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('WizardFooterDual', () => {
  it('renders back and next buttons', () => {
    render(<Wrapper><WizardFooterDual /></Wrapper>);
    expect(screen.getByText('Terug')).toBeInTheDocument();
    expect(screen.getByText('Verder')).toBeInTheDocument();
  });

  it('renders custom labels', () => {
    render(
      <Wrapper>
        <WizardFooterDual backLabel="Previous" nextLabel="Continue" />
      </Wrapper>
    );
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });
});

describe('WizardFooterSubmit', () => {
  it('renders with default label', () => {
    render(<Wrapper><WizardFooterSubmit /></Wrapper>);
    expect(screen.getByText('Genereer')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<Wrapper><WizardFooterSubmit label="Submit" /></Wrapper>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });
});
