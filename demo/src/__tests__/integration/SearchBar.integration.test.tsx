/**
 * Integration test — SearchBar
 *
 * Tests: type query → calls searchGlobal, renders input, callback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import { SearchBar } from '../../components/SearchBar';

const mockNavigate = vi.fn();
const mockSearchGlobal = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useSearch', () => ({
  useSearch: () => ({ searchGlobal: mockSearchGlobal, isSearching: false, error: null }),
  useDebounce: (v: string) => v,
}));

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe('SearchBar integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchGlobal.mockResolvedValue({});
  });

  it('renders the search input', () => {
    renderWithProviders(<SearchBar />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    renderWithProviders(<SearchBar placeholder="Find players..." />);
    expect(screen.getByPlaceholderText('Find players...')).toBeInTheDocument();
  });

  it('triggers search when user types', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar />);
    await user.type(screen.getByRole('textbox'), 'test');
    await waitFor(() => expect(mockSearchGlobal).toHaveBeenCalled());
  });

  it('calls onQueryChange callback', async () => {
    const onQueryChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SearchBar onQueryChange={onQueryChange} />);
    await user.type(screen.getByRole('textbox'), 'abc');
    expect(onQueryChange).toHaveBeenCalled();
  });
});
