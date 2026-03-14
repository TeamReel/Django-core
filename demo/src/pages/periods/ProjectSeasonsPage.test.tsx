import { renderWithProviders } from '@/test';
import { ProjectSeasonsPage } from './ProjectSeasonsPage';

vi.mock('@django-core/design-system', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../../shims/design-system', () => ({
  Table: Object.assign(
    ({ children }: any) => <table>{children}</table>,
    {
      Head: ({ children }: any) => <thead>{children}</thead>,
      Body: ({ children }: any) => <tbody>{children}</tbody>,
      Row: ({ children }: any) => <tr>{children}</tr>,
      Cell: ({ children }: any) => <td>{children}</td>,
      HeaderCell: ({ children }: any) => <th>{children}</th>,
    },
  ),
}));

vi.mock('@/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ results: [] }) },
}));

vi.mock('../../utils/periodPath', () => ({
  periodPathKey: () => 'seasons',
}));

describe('ProjectSeasonsPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ProjectSeasonsPage />, {
      routerProps: { initialEntries: ['/projects/1/seasons'] },
    });
  });
});
