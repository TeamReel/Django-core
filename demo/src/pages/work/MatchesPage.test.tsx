import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import MatchesPage from './MatchesPage';

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../identity/directory/MatchesList', () => ({
  MatchesList: () => <div>MatchesList</div>,
}));

describe('MatchesPage', () => {
  it('renders title', () => {
    renderWithProviders(<MatchesPage />);
    expect(screen.getByText('Matches')).toBeInTheDocument();
  });
});
