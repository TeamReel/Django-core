import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import RegisterPage from './RegisterPage';

vi.mock('@django-core/auth-ui', () => ({
  useSignUp: vi.fn(() => ({ signUp: vi.fn(), isLoading: false, error: null })),
  useAuth: vi.fn(() => ({ user: null })),
}));

describe('RegisterPage', () => {
  it('renders heading', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('renders form fields', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('has link to login', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByText(/Sign in here/i)).toBeInTheDocument();
  });
});
