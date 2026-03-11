import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import ClubsPage from './ClubsPage';

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../identity/directory/ClubsList', () => ({
  ClubsList: () => <div>ClubsList</div>,
}));

describe('ClubsPage', () => {
  it('renders title', () => {
    renderWithProviders(<ClubsPage />);
    expect(screen.getByText('Clubs')).toBeInTheDocument();
  });

  it('renders clubs list', () => {
    renderWithProviders(<ClubsPage />);
    expect(screen.getByText('ClubsList')).toBeInTheDocument();
  });
});
