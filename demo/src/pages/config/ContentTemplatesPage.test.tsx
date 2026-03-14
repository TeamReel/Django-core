import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import ContentTemplatesPage from './ContentTemplatesPage';

vi.mock('@django-core/design-system', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Input: (props: any) => <input {...props} />,
  Alert: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@django-core/page-templates', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  PageContent: ({ children }: any) => <div>{children}</div>,
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

vi.mock('./contentTemplatesData', () => ({
  TYPE_LABELS: {},
  SUBTYPE_LABELS: {},
  TEMPLATE_CATEGORIES: [],
}));

vi.mock('./useContentTemplatesData', () => ({
  useContentTemplatesData: () => ({
    templates: [],
    filteredTemplates: [],
    loading: false,
    error: null,
    selectedCategory: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    showInactive: false,
    setShowInactive: vi.fn(),
    selectedFormation: '',
    setSelectedFormation: vi.fn(),
    selectedStyle: '',
    setSelectedStyle: vi.fn(),
    selectedSport: '',
    setSelectedSport: vi.fn(),
    selectedSubtype: '',
    setSelectedSubtype: vi.fn(),
    selectedType: '',
    setSelectedType: vi.fn(),
    availableFormations: [],
    availableStyles: [],
    availableSports: [],
    availableTypes: [],
    availableSubtypes: [],
    isCreateModalOpen: false,
    setIsCreateModalOpen: vi.fn(),
    editingTemplate: null,
    setEditingTemplate: vi.fn(),
    saving: false,
    modalTab: 'basic',
    setModalTab: vi.fn(),
    editForm: {},
    setEditForm: vi.fn(),
    sportCategories: [],
    formationsForSelectedSport: [],
    getVariantsForCategory: vi.fn(() => []),
    getSubtypesForType: vi.fn(() => []),
    handleToggleActive: vi.fn(),
    handleDelete: vi.fn(),
    handleSaveTemplate: vi.fn(),
    pageTitle: 'Content Templates',
    navigate: vi.fn(),
  }),
}));

vi.mock('./ContentTemplateModal', () => ({
  ContentTemplateModal: () => null,
}));

describe('ContentTemplatesPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<ContentTemplatesPage />);
  });
});
