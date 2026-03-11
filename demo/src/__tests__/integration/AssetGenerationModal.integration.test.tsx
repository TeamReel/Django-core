/**
 * Integration test — AssetGenerationModal
 *
 * Tests: modal open/close behaviour, header rendering, template step display.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test';

const mockHandleClose = vi.fn();
const mockHandleSelectTemplate = vi.fn();

vi.mock('../../components/AssetGenerationModal/useAssetGenModal', () => ({
  useAssetGenModal: () => ({
    modalStep: 'template' as const,
    setModalStep: vi.fn(),
    params: {},
    setParams: vi.fn(),
    variantCount: 1,
    setVariantCount: vi.fn(),
    extraInstructions: '',
    setExtraInstructions: vi.fn(),
    feedbackFields: { colors: '', pattern: '', logo: '', collar: '', other: '' },
    setFeedbackFields: vi.fn(),
    selectedVariantIdx: 0,
    setSelectedVariantIdx: vi.fn(),
    saving: false,
    referenceSource: 'upload',
    setReferenceSource: vi.fn(),
    shoeColor: 'zwart',
    setShoeColor: vi.fn(),
    setVideoProvider: vi.fn(),
    selectedModel: '',
    setSelectedModel: vi.fn(),
    selectedBackgroundIdx: 0,
    setSelectedBackgroundIdx: vi.fn(),
    templates: [
      { id: 'tenue_generate', name: 'Tenue genereren', description: 'Generate kit', inputRequirements: [], outputAssetType: 'kit_home', category: 'club' },
      { id: 'fullbody_in_tenue', name: 'Speler in tenue', description: 'Player in kit', inputRequirements: ['source'], outputAssetType: 'member_in_tenue', category: 'member' },
    ],
    selectedTemplate: null,
    generation: { step: 'idle', results: [], error: null, isGenerating: false, submit: vi.fn(), reset: vi.fn() },
    stepTitle: 'Stap 1 — Kies type',
    handleSelectTemplate: mockHandleSelectTemplate,
    handleGenerate: vi.fn(),
    handleAccept: vi.fn(),
    handleRegenerate: vi.fn(),
    handleClose: mockHandleClose,
    selectedTemplateId: null,
  }),
}));

vi.mock('../../components/AssetGenerationModal/AssetGenSubComponents', () => ({
  TemplateCard: ({ template, onClick }: any) => (
    <button data-testid={`template-${template.id}`} onClick={onClick}>
      {template.name}
    </button>
  ),
  ParameterSelect: () => null,
}));

vi.mock('../../components/AssetGenerationModal/AssetGenConfigWidgets', () => ({
  SourcePicker: () => null,
  BackgroundSelector: () => null,
  ModelSelector: () => null,
}));

vi.mock('../../components/AssetGenerationModal/AssetGenResultsWidgets', () => ({
  ResultsStep: () => null,
}));

vi.mock('../../components/AssetGenerationModal/AssetGenerationModal.module.css', () => ({
  default: { backdrop: '', modal: '', header: '', closeButton: '', templateGrid: '' },
}));

import AssetGenerationModal from '../../components/AssetGenerationModal/AssetGenerationModal';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  context: 'club' as const,
  projectId: 'proj-1',
  organisationId: 'org-1',
};

describe('AssetGenerationModal integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when not open', () => {
    const { container } = renderWithProviders(
      <AssetGenerationModal {...baseProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders header and step title', () => {
    renderWithProviders(<AssetGenerationModal {...baseProps} />);
    expect(screen.getByText(/AI Asset Genereren/)).toBeInTheDocument();
    expect(screen.getByText('Stap 1 — Kies type')).toBeInTheDocument();
  });

  it('renders template cards on template step', () => {
    renderWithProviders(<AssetGenerationModal {...baseProps} />);
    expect(screen.getByText('Tenue genereren')).toBeInTheDocument();
    expect(screen.getByText('Speler in tenue')).toBeInTheDocument();
  });

  it('selects template on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssetGenerationModal {...baseProps} />);
    await user.click(screen.getByTestId('template-tenue_generate'));
    expect(mockHandleSelectTemplate).toHaveBeenCalledWith('tenue_generate');
  });

  it('calls handleClose when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssetGenerationModal {...baseProps} />);
    await user.click(screen.getByText('✕'));
    expect(mockHandleClose).toHaveBeenCalled();
  });
});
