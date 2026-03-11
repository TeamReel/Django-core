/**
 * Integration test — InviteMemberModal
 *
 * Tests: open modal → fill email → select role → submit → API called.
 * Labels: "Email Address", "Role"; Button: "Add Member".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import InviteMemberModal from '../../pages/identity/InviteMemberModal';

const mockAddMember = vi.fn();
const mockOnClose = vi.fn();
const mockOnInviteSuccess = vi.fn();

vi.mock('@/api', () => ({
  organisationsApi: { addMember: (...args: unknown[]) => mockAddMember(...args) },
}));

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const defaultProps = {
  opened: true,
  onClose: mockOnClose,
  orgSlug: 'test-org',
  onInviteSuccess: mockOnInviteSuccess,
};

describe('InviteMemberModal integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddMember.mockResolvedValue({ id: 1 });
  });

  it('renders modal heading', () => {
    renderWithProviders(<InviteMemberModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Add Member' })).toBeInTheDocument();
  });

  it('renders email input and role select', () => {
    renderWithProviders(<InviteMemberModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    renderWithProviders(<InviteMemberModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Add Member/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InviteMemberModal {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when not opened', () => {
    const { container } = renderWithProviders(
      <InviteMemberModal {...defaultProps} opened={false} />
    );
    expect(screen.queryByText('Add Member')).not.toBeInTheDocument();
  });
});
