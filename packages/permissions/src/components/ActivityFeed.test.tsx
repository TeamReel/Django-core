import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ActivityFeed } from './ActivityFeed';
import { fetchWithCSRF } from '@django-core/api-client';
import { vi } from 'vitest';

// Mock the API client
vi.mock('@django-core/api-client', () => ({
  fetchWithCSRF: vi.fn(),
}));

// Mock the design system components
vi.mock('@django-core/design-system', () => ({
  Modal: ({ children, isOpen, onClose, title }: any) => (
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-header">
          {title}
          <button onClick={onClose} data-testid="modal-close">Close</button>
        </div>
        <div data-testid="modal-body">{children}</div>
      </div>
    ) : null
  ),
  Grid: ({ children, ...props }: any) => <div data-testid="grid" {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span data-testid="text" {...props}>{children}</span>,
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
  Stack: ({ children, ...props }: any) => <div data-testid="stack" {...props}>{children}</div>,
  Heading: ({ children, ...props }: any) => <h2 data-testid="heading" {...props}>{children}</h2>,
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Button: ({ children, ...props }: any) => <button data-testid="button" {...props}>{children}</button>,
  Select: ({ options, ...props }: any) => (
    <select data-testid="select" {...props}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
}));

describe('ActivityFeed', () => {
  const mockEvents = [
    {
      id: '1',
      actor: { id: 'u1', email: 'admin@example.com', name: 'Admin User' },
      type: 'MEMBER_ADDED',
      target: { id: 'u2', name: 'User Two', type: 'USER' },
      timestamp: '2023-01-01T10:00:00Z',
      details: { role: 'member' }
    },
    {
      id: '2',
      actor: { id: 'u2', email: 'user2@example.com', name: 'User Two' },
      type: 'ROLE_CHANGED',
      target: { id: 'u3', name: 'User Three', type: 'USER' },
      timestamp: '2023-01-02T11:00:00Z',
      details: { old_role: 'member', new_role: 'admin' }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (fetchWithCSRF as any).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ActivityFeed projectId="p1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders events after loading', async () => {
    (fetchWithCSRF as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: mockEvents,
        next: null
      })
    });

    render(<ActivityFeed projectId="p1" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'Admin User added User Two to the team.';
    })).toBeInTheDocument();

    expect(screen.getByText((content, element) => {
      return element?.textContent === 'User Two changed role of User Three to admin.';
    })).toBeInTheDocument();
  });

  it('handles empty state', async () => {
    (fetchWithCSRF as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
        next: null
      })
    });

    render(<ActivityFeed projectId="p1" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No activity found.')).toBeInTheDocument();
  });

  it('handles API error', async () => {
    (fetchWithCSRF as any).mockResolvedValue({
      ok: false,
      status: 500
    });

    render(<ActivityFeed projectId="p1" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch activity')).toBeInTheDocument();
  });

  it('filters events by type', async () => {
    (fetchWithCSRF as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: mockEvents,
        next: null
      })
    });

    render(<ActivityFeed projectId="p1" />);

    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    // Change filter
    const select = screen.getByTestId('select');
    fireEvent.change(select, { target: { value: 'MEMBER_ADDED' } });

    await waitFor(() => {
      expect(fetchWithCSRF).toHaveBeenCalledWith(expect.stringContaining('type=MEMBER_ADDED'));
      expect(fetchWithCSRF).toHaveBeenCalledWith(expect.stringContaining('project=p1'));
    });
  });

  it('loads more events when requested', async () => {
    // First page
    (fetchWithCSRF as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [mockEvents[0]],
        next: 'http://api.example.com/activity?page=2'
      })
    });

    // Second page
    (fetchWithCSRF as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [mockEvents[1]],
        next: null
      })
    });

    render(<ActivityFeed projectId="p1" />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const loadMoreBtn = screen.getByText('Load More');
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    // Should show both events
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });
});
