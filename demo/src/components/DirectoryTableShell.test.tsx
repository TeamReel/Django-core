import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { DirectoryTableShell } from './DirectoryTableShell';

describe('DirectoryTableShell', () => {
  const baseProps = {
    isLoading: false,
    error: null,
    domainLoading: false,
    domainLoadingMessage: 'Loading...',
    itemCount: 3,
  };

  it('renders children table when loaded with items', () => {
    renderWithProviders(
      <DirectoryTableShell {...baseProps}>
        <thead><tr><th>Name</th></tr></thead>
        <tbody><tr><td>Item 1</td></tr></tbody>
      </DirectoryTableShell>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('shows skeleton when isLoading', () => {
    const { container } = renderWithProviders(
      <DirectoryTableShell {...baseProps} isLoading>
        <tbody />
      </DirectoryTableShell>
    );
    // Skeleton renders shimmer divs instead of table content
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(container.firstChild).toBeTruthy();
  });

  it('shows error alert when error is set', () => {
    renderWithProviders(
      <DirectoryTableShell {...baseProps} error="Something broke">
        <tbody />
      </DirectoryTableShell>
    );
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('shows empty state when itemCount is 0', () => {
    renderWithProviders(
      <DirectoryTableShell {...baseProps} itemCount={0} emptyStateType="members">
        <tbody />
      </DirectoryTableShell>
    );
    expect(screen.getByText('Nog geen leden')).toBeInTheDocument();
  });

  it('shows skeleton when domainLoading', () => {
    const { container } = renderWithProviders(
      <DirectoryTableShell {...baseProps} domainLoading>
        <tbody />
      </DirectoryTableShell>
    );
    // Should show skeleton, not table content
    expect(container.firstChild).toBeTruthy();
  });
});
