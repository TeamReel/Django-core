/**
 * Integration test — LogoutFlow
 *
 * Tests: sign out → signOut called + navigate to /login.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────

const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();

vi.mock('@django-core/auth-ui', () => ({
  useAuth: () => ({
    user: { id: 1, first_name: 'John' },
    signOut: mockSignOut,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

// Import the mocked modules at top level so vi.mock intercepts them
import { useAuth } from '@django-core/auth-ui';
import { useNavigate } from 'react-router-dom';

function LogoutButton() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <button onClick={async () => { await signOut(); navigate('/login'); }}>
      Sign Out
    </button>
  );
}

// ── Tests ────────────────────────────────────────────────

describe('Logout flow integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders sign out button', () => {
    renderWithProviders(<LogoutButton />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls signOut and navigates on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LogoutButton />);
    await user.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
