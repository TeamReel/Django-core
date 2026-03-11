/**
 * Integration test — RegisterPage
 *
 * Tests: render form → validation → submit → signUp called,
 * password mismatch error, redirect when authenticated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import RegisterPage from '../../pages/RegisterPage';

// ── Mocks ────────────────────────────────────────────────

const mockSignUp = vi.fn();
const mockNavigate = vi.fn();
let mockUser: { id: number } | null = null;
let mockError: { formErrors: string[]; fieldErrors: Record<string, string[]> } | null = null;

vi.mock('@django-core/auth-ui', () => ({
  useSignUp: () => ({ signUp: mockSignUp, isLoading: false, error: mockError }),
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

// ── Tests ────────────────────────────────────────────────

describe('RegisterPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockError = null;
  });

  it('renders all registration fields', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('shows password mismatch error on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText('Email Address'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.type(screen.getByLabelText('Confirm Password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows short password error on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText('Email Address'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp with correct args on valid submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByLabelText('First Name'), 'John');
    await user.type(screen.getByLabelText('Last Name'), 'Doe');
    await user.type(screen.getByLabelText('Email Address'), 'john@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(mockSignUp).toHaveBeenCalledWith('john@test.com', 'password123', 'John', 'Doe');
  });

  it('redirects to /dashboard when already authenticated', () => {
    mockUser = { id: 1 };
    renderWithProviders(<RegisterPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('has link to login page', () => {
    renderWithProviders(<RegisterPage />);
    const link = screen.getByText(/Sign in here/i);
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });
});
