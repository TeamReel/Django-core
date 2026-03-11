import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import CompetitionsPage from './CompetitionsPage';

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../identity/directory/CompetitionsList', () => ({
  CompetitionsList: () => <div>CompetitionsList</div>,
}));

describe('CompetitionsPage', () => {
  it('renders title', () => {
    renderWithProviders(<CompetitionsPage />);
    expect(screen.getByText('Competitions')).toBeInTheDocument();
  });
});
