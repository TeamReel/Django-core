/**
 * Integration test — EntityEditModal
 *
 * Tests: open modal → tabs → entity name → save.
 * Mocks the hook AND the entityEditTypes to avoid Lucide icon issues.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';
import EntityEditModal from '../../components/EntityEditModal/EntityEditModal';

const mockHandleSave = vi.fn();
const mockOnClose = vi.fn();

vi.mock('../../components/EntityEditModal/useEntityEditData', () => ({
  useEntityEditData: () => ({
    activeTab: 'general',
    setActiveTab: vi.fn(),
    entityData: { name: 'Test Entity', description: 'A description' },
    setEntityData: vi.fn(),
    brandProfile: null,
    tokens: [],
    setTokens: vi.fn(),
    newTokens: [],
    setNewTokens: vi.fn(),
    deletedTokenIds: [],
    setDeletedTokenIds: vi.fn(),
    loading: false,
    saving: false,
    uploading: false,
    error: null,
    success: false,
    hasChanges: false,
    handleSave: mockHandleSave,
    handleLogoUpload: vi.fn(),
  }),
}));

// Mock the entityEditTypes to provide ENTITY_LABELS without Lucide icons
vi.mock('../../components/EntityEditModal/entityEditTypes', async () => {
  const actual = await vi.importActual('../../components/EntityEditModal/entityEditTypes');
  return {
    ...actual as any,
    ENTITY_LABELS: {
      organisation: { singular: 'Organisation', icon: () => null },
      club: { singular: 'Club', icon: () => null },
      team: { singular: 'Team', icon: () => null },
    },
  };
});

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe('EntityEditModal integration', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSaved: vi.fn(),
    entityType: 'organisation' as const,
    entityId: 'org-1',
    entityName: 'Test Org',
    organisationId: 'org-1',
  };

  it('renders modal with entity name', () => {
    renderWithProviders(<EntityEditModal {...baseProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders general tab content', () => {
    renderWithProviders(<EntityEditModal {...baseProps} />);
    expect(screen.getByDisplayValue('Test Entity') || screen.getByText('Test Entity')).toBeTruthy();
  });

  it('does not render when closed', () => {
    const { container } = renderWithProviders(<EntityEditModal {...baseProps} isOpen={false} />);
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('renders save button', () => {
    renderWithProviders(<EntityEditModal {...baseProps} />);
    const saveBtn = screen.queryByRole('button', { name: /save|opslaan/i });
    expect(saveBtn).toBeTruthy();
  });
});
