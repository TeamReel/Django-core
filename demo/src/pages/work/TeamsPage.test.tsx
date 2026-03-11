import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import TeamsPage from './TeamsPage';

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../identity/directory/TeamsList', () => ({
  TeamsList: () => <div>TeamsList</div>,
}));

describe('TeamsPage', () => {
  it('renders title', () => {
    renderWithProviders(<TeamsPage />);
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders teams list', () => {
    renderWithProviders(<TeamsPage />);
    expect(screen.getByText('TeamsList')).toBeInTheDocument();
  });
});
