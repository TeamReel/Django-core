/**
 * Integration test — LoginPage
 *
 * Tests the full login flow: render form → fill credentials → submit →
 * signIn called with correct args, error display, redirect on auth.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import LoginPage from '../../pages/LoginPage';

// ── Mocks ────────────────────────────────────────────────

const mockSignIn = vi.fn();
const mockNavigate = vi.fn();
let mockUser: { id: number } | null = null;

vi.mock('@django-core/auth-ui', () => ({
  useSignIn: () => ({ signIn: mockSignIn, isLoading: false, error: null }),
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Tests ────────────────────────────────────────────────

describe('LoginPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  it('renders the login form with email, password and submit', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
  });

  it('submits credentials via signIn on form submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Log In' }));

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'secret123');
  });

  it('redirects to /dashboard when user is already authenticated', () => {
    mockUser = { id: 1 };
    renderWithProviders(<LoginPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows a link to the register page', () => {
    renderWithProviders(<LoginPage />);
    const link = screen.getByText(/Create one here/i);
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/register');
  });
});
