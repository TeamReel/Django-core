import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { TransactionWidget } from './TransactionWidget';

// Mock useTransactions
vi.mock('../../hooks/useTransactions', () => ({
  useTransactions: vi.fn(),
}));

import { useTransactions } from '../../hooks/useTransactions';
const mockUseTransactions = vi.mocked(useTransactions);

describe('TransactionWidget', () => {
  it('shows loading state', () => {
    mockUseTransactions.mockReturnValue({
      transactions: [],
      loading: true,
      error: null,
    } as ReturnType<typeof useTransactions>);

    renderWithProviders(<TransactionWidget />);
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    mockUseTransactions.mockReturnValue({
      transactions: [],
      loading: false,
      error: null,
    } as ReturnType<typeof useTransactions>);

    renderWithProviders(<TransactionWidget />);
    expect(screen.getByText('Geen transacties')).toBeInTheDocument();
  });

  it('renders transactions', () => {
    mockUseTransactions.mockReturnValue({
      transactions: [
        { id: '1', amount: '10.00', notes: 'Generation credit', timestamp: new Date().toISOString(), created_at: new Date().toISOString(), source_type: 'generation' },
        { id: '2', amount: '-5.00', notes: 'Content used', timestamp: new Date().toISOString(), created_at: new Date().toISOString(), source_type: 'usage' },
      ],
      loading: false,
      error: null,
    } as unknown as ReturnType<typeof useTransactions>);

    renderWithProviders(<TransactionWidget />);
    expect(screen.getByText('Generation credit')).toBeInTheDocument();
    expect(screen.getByText('Content used')).toBeInTheDocument();
  });

  it('renders title', () => {
    mockUseTransactions.mockReturnValue({
      transactions: [],
      loading: false,
      error: null,
    } as ReturnType<typeof useTransactions>);

    renderWithProviders(<TransactionWidget />);
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });
});
