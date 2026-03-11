import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import LoginPage from './LoginPage';

vi.mock('@django-core/auth-ui', () => ({
  useSignIn: vi.fn(() => ({ signIn: vi.fn(), isLoading: false, error: null })),
  useAuth: vi.fn(() => ({ user: null })),
}));

describe('LoginPage', () => {
  it('renders email and password inputs', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
  });

  it('has link to register', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText(/Create one here/i)).toBeInTheDocument();
  });
});
