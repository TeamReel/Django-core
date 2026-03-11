import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import SeasonsPage from './SeasonsPage';

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../identity/directory/SeasonsList', () => ({
  SeasonsList: () => <div>SeasonsList</div>,
}));

describe('SeasonsPage', () => {
  it('renders title', () => {
    renderWithProviders(<SeasonsPage />);
    expect(screen.getByText('Seasons')).toBeInTheDocument();
  });
});
