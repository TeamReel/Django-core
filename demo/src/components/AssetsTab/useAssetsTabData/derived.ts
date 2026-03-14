/**
 * useAssetsTabData/derived.ts
 * Computed values for effective assets and AI inputs.
 */

import { useCallback, useMemo } from 'react';
import { getAssetUrl, type BrandAsset } from '@/hooks/useBrandProfile';

interface UseDerivedAssetsParams {
  getAsset: (assetType: string) => BrandAsset | undefined;
  parentProjectId: string | number | null | undefined;
  parentGetAsset: ((assetType: string) => BrandAsset | undefined) | undefined;
}

export function useDerivedAssets({
  getAsset,
  parentProjectId,
  parentGetAsset,
}: UseDerivedAssetsParams) {
  /** Get asset from own or parent brand profile */
  const getEffectiveAsset = useCallback((assetType: string): { asset: BrandAsset | undefined; inherited: boolean } => {
    const own = getAsset(assetType);
    if (own) return { asset: own, inherited: false };

    if (parentProjectId && parentGetAsset) {
      const parent = parentGetAsset(assetType);
      if (parent) return { asset: parent, inherited: true };
    }

    return { asset: undefined, inherited: false };
  }, [getAsset, parentProjectId, parentGetAsset]);

  /** Base AI input assets (logo + sponsor) for AI generation */
  const baseAiInputAssets = useMemo(() => {
    const getEff = (type: string) => {
      const own = getAsset(type);
      if (own) return own;
      if (parentProjectId && parentGetAsset) return parentGetAsset(type);
      return undefined;
    };

    const logoAsset = getEff('logo_upload');
    const sponsorAsset = getEff('sponsor_logo_upload');

    return {
      logo: logoAsset ? getAssetUrl(logoAsset.url) : null,
      sponsor: sponsorAsset ? getAssetUrl(sponsorAsset.url) : null,
    };
  }, [getAsset, parentGetAsset, parentProjectId]);

  return {
    getEffectiveAsset,
    baseAiInputAssets,
  };
}
