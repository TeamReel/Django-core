import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { DirectoryPage } from './DirectoryPage';

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./directory/ClubsList', () => ({ ClubsList: () => <div>ClubsList</div> }));
vi.mock('./directory/FederationsList', () => ({ FederationsList: () => <div>FederationsList</div> }));
vi.mock('./directory/TeamsList', () => ({ TeamsList: () => <div>TeamsList</div> }));
vi.mock('./directory/SeasonsList', () => ({ SeasonsList: () => <div>SeasonsList</div> }));
vi.mock('./directory/CompetitionsList', () => ({ CompetitionsList: () => <div>CompetitionsList</div> }));
vi.mock('./directory/MatchesList', () => ({ MatchesList: () => <div>MatchesList</div> }));
vi.mock('./directory/UsersList', () => ({ UsersList: () => <div>UsersList</div> }));
vi.mock('./directory/ContentOverview', () => ({ ContentOverview: () => <div>ContentOverview</div> }));
vi.mock('./directory/ContentList', () => ({ ContentList: () => <div>ContentList</div> }));

describe('DirectoryPage', () => {
  it('renders title', () => {
    renderWithProviders(<DirectoryPage />);
    expect(screen.getByText('Directory')).toBeInTheDocument();
  });


});
