import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../../pages/identity/ContentGenerationModal/contentGenerationApi', () => ({
  saveGeneratedVariant: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('lucide-react', () => ({ CheckCircle: 'CheckCircle' }));

import { useSaveHandlers } from '../../../../pages/identity/ContentGenerationModal/useSaveHandlers';

const makeVariant = (idx: number) => ({
  presigned_url: `https://cdn.example.com/variant-${idx}.png`,
  mime_type: 'image/png',
  storage_info: null,
});

const makeDeps = (overrides: Record<string, unknown> = {}) => ({
  matchData: { id: 'match-1' } as any,
  organisationId: 'org-1',
  assetType: 'flyer',
  onGenerated: vi.fn(),
  onClose: vi.fn(),
  selectedType: { type: 'pre_match', subtype: 'lineup', label: 'Lineup' },
  selectedTemplate: { id: 1, name: 'Test Template' } as any,
  generatedVariants: [makeVariant(0), makeVariant(1)] as any[],
  generatedOutput: { presigned_url: 'https://cdn.example.com/out.png' } as any,
  selectedVariantIndex: 0,
  savedVariantIndices: new Set<number>(),
  setGeneratedVariants: vi.fn(),
  setSavingAsset: vi.fn(),
  setSaveSuccess: vi.fn(),
  setSavedVariantIndices: vi.fn(),
  setGenerationError: vi.fn(),
  pushToast: vi.fn(),
  navigate: vi.fn(),
  ...overrides,
});

describe('useSaveHandlers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handleSaveVariantByIndex calls saveGeneratedVariant', async () => {
    const { saveGeneratedVariant } = await import('../../../../pages/identity/ContentGenerationModal/contentGenerationApi');
    vi.mocked(saveGeneratedVariant).mockResolvedValue({ brand_asset_id: 'ba-1', storage_path: '/saved' } as any);
    const deps = makeDeps();
    const { result } = renderHook(() => useSaveHandlers(deps));
    await act(async () => { await result.current.handleSaveVariantByIndex(0); });
    expect(saveGeneratedVariant).toHaveBeenCalledTimes(1);
    expect(deps.setSavedVariantIndices).toHaveBeenCalled();
  });

  it('handleSaveAsAsset saves the selected variant', async () => {
    const { saveGeneratedVariant } = await import('../../../../pages/identity/ContentGenerationModal/contentGenerationApi');
    vi.mocked(saveGeneratedVariant).mockResolvedValue({} as any);
    const deps = makeDeps();
    const { result } = renderHook(() => useSaveHandlers(deps));
    await act(async () => { await result.current.handleSaveAsAsset(); });
    expect(saveGeneratedVariant).toHaveBeenCalled();
    expect(deps.setSavingAsset).toHaveBeenCalledWith(true);
  });

  it('sets generation error on save failure', async () => {
    const { saveGeneratedVariant } = await import('../../../../pages/identity/ContentGenerationModal/contentGenerationApi');
    vi.mocked(saveGeneratedVariant).mockRejectedValue(new Error('Upload failed'));
    const deps = makeDeps();
    const { result } = renderHook(() => useSaveHandlers(deps));
    await act(async () => { await result.current.handleSaveVariantByIndex(0); });
    expect(deps.setGenerationError).toHaveBeenCalledWith('Upload failed');
  });

  it('handleSaveAllAsAssets loops through unsaved variants', async () => {
    const { saveGeneratedVariant } = await import('../../../../pages/identity/ContentGenerationModal/contentGenerationApi');
    vi.mocked(saveGeneratedVariant).mockResolvedValue({ brand_asset_id: 'ba-1' } as any);
    const deps = makeDeps();
    const { result } = renderHook(() => useSaveHandlers(deps));
    await act(async () => { await result.current.handleSaveAllAsAssets(); });
    expect(saveGeneratedVariant).toHaveBeenCalledTimes(2); // both variants
    expect(deps.setSaveSuccess).toHaveBeenCalledWith(true);
    expect(deps.pushToast).toHaveBeenCalled();
  });

  it('handleSaveAllAsAssets skips already-saved variants', async () => {
    const { saveGeneratedVariant } = await import('../../../../pages/identity/ContentGenerationModal/contentGenerationApi');
    vi.mocked(saveGeneratedVariant).mockResolvedValue({} as any);
    const deps = makeDeps({ savedVariantIndices: new Set([0]) });
    const { result } = renderHook(() => useSaveHandlers(deps));
    await act(async () => { await result.current.handleSaveAllAsAssets(); });
    expect(saveGeneratedVariant).toHaveBeenCalledTimes(1); // only variant 1
  });
});
