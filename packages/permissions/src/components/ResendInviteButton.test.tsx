import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResendInviteButton } from './ResendInviteButton';
import { fetchWithCSRF } from '@django-core/api-client';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@django-core/api-client', () => ({
  fetchWithCSRF: vi.fn(),
}));

vi.mock('@django-core/design-system', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Spinner: () => <span>Loading...</span>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

describe('ResendInviteButton', () => {
  const defaultProps = {
    projectId: 'p1',
    invitationId: 'inv1',
    onSuccess: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ResendInviteButton {...defaultProps} />);
    expect(screen.getByText('Resend Invite')).toBeInTheDocument();
  });

  it('calls API on click', async () => {
    (fetchWithCSRF as any).mockResolvedValue({ ok: true });
    render(<ResendInviteButton {...defaultProps} />);

    fireEvent.click(screen.getByText('Resend Invite'));

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchWithCSRF).toHaveBeenCalledWith(
        '/api/v1/projects/p1/invitations/inv1/resend/',
        { method: 'POST' }
      );
    });

    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('handles error', async () => {
    (fetchWithCSRF as any).mockResolvedValue({ ok: false });
    render(<ResendInviteButton {...defaultProps} />);

    fireEvent.click(screen.getByText('Resend Invite'));

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('Failed to resend invitation');
    });
  });
});
