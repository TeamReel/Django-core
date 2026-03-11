import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';
import { act } from '@testing-library/react';

function TestConsumer() {
  const confirm = useConfirm();
  return (
    <button onClick={async () => {
      const result = await confirm({ message: 'Are you sure?', title: 'Delete Item' });
      // Store result for assertion
      document.title = result ? 'confirmed' : 'cancelled';
    }}>
      Trigger
    </button>
  );
}

describe('ConfirmDialog', () => {
  it('opens dialog with message and title', async () => {
    render(
      <ConfirmProvider>
        <TestConsumer />
      </ConfirmProvider>
    );

    fireEvent.click(screen.getByText('Trigger'));
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('shows Confirm and Cancel buttons', () => {
    render(
      <ConfirmProvider>
        <TestConsumer />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText('Trigger'));
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('resolves true on confirm click', async () => {
    render(
      <ConfirmProvider>
        <TestConsumer />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText('Trigger'));

    await act(async () => {
      fireEvent.click(screen.getByText('Confirm'));
    });

    expect(document.title).toBe('confirmed');
  });

  it('resolves false on cancel click', async () => {
    document.title = '';
    render(
      <ConfirmProvider>
        <TestConsumer />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText('Trigger'));

    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(document.title).toBe('cancelled');
  });

  it('throws when useConfirm is used outside provider', () => {
    function Bad() {
      useConfirm();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useConfirm must be used within <ConfirmProvider>');
  });
});
