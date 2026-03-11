import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import WorkflowTemplatesPage from './WorkflowTemplatesPage';

vi.mock('@django-core/page-templates', () => ({
  PageContent: ({ children }: any) => <div>{children}</div>,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('../../components/SlotIcon', () => ({
  default: () => <span>icon</span>,
}));

vi.mock('../../hooks/useWorkflows', () => ({
  useWorkflowTemplates: () => ({
    templates: [],
    isLoading: false,
    error: null,
  }),
  getStateDisplay: () => ({ label: '', color: '' }),
  getActionDisplay: () => ({ label: '', icon: '' }),
}));

vi.mock('../../components/Workflows/WorkflowStatusBadge', () => ({
  WorkflowStatusBadge: () => <span>badge</span>,
}));

describe('WorkflowTemplatesPage', () => {
  it('renders title', () => {
    renderWithProviders(<WorkflowTemplatesPage />);
    expect(screen.getByText('Workflow Templates')).toBeInTheDocument();
  });
});
