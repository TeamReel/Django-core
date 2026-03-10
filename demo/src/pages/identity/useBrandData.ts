import { useMemo } from 'react';

import useBrandProfile from '@/hooks/useBrandProfile';
import { getAssetUrl } from '@/hooks/useBrandProfile';
import { KIT_ROLES } from './useTeamTabData.types';

interface UseBrandDataParams {
  activeTabFromUrl: string;
  orgId: string;
  clubId: string;
  teamIdForDirectoryLists: string;
}

export interface UseBrandDataReturn {
  brandAssets: { label: string; present: boolean }[];
  brandLogoUrl: string | null;
  brandSponsorUrl: string | null;
  batchBrandKits: Record<string, string | null>;
}

export function useBrandData({
  activeTabFromUrl,
  orgId,
  clubId,
  teamIdForDirectoryLists,
}: UseBrandDataParams): UseBrandDataReturn {
  const clubBrand = useBrandProfile({
    projectId: clubId || undefined,
    organisationId: orgId || undefined,
    autoFetch: !!(clubId && (activeTabFromUrl === 'overview')),
  });

  const teamBrand = useBrandProfile({
    projectId: teamIdForDirectoryLists || undefined,
    organisationId: orgId || undefined,
    autoFetch: !!(teamIdForDirectoryLists && (activeTabFromUrl === 'overview')),
  });

  /** Pre-built kit URLs (team takes priority over club) */
  const batchBrandKits = useMemo(() => {
    const kits: Record<string, string | null> = {};
    for (const role of KIT_ROLES) {
      const teamAsset =
        teamBrand.getAsset?.(`kit_${role.id}_combined`) ||
        teamBrand.getAsset?.(`kit_${role.id}`);
      const clubAsset =
        clubBrand.getAsset?.(`kit_${role.id}_combined`) ||
        clubBrand.getAsset?.(`kit_${role.id}`);
      const asset = teamAsset || clubAsset;
      kits[role.id] = asset ? getAssetUrl(asset.url) : null;
    }
    return kits;
  }, [clubBrand, teamBrand]);

  const brandLogoUrl = useMemo(
    () =>
      clubBrand.getAsset?.('logo_upload')
        ? getAssetUrl(clubBrand.getAsset('logo_upload')!.url)
        : null,
    [clubBrand],
  );

  const brandSponsorUrl = useMemo(
    () =>
      clubBrand.getAsset?.('sponsor_logo_upload')
        ? getAssetUrl(clubBrand.getAsset('sponsor_logo_upload')!.url)
        : null,
    [clubBrand],
  );

  /** Brand assets checklist */
  const brandAssets = useMemo(() => {
    const items: { label: string; present: boolean }[] = [
      { label: 'Logo', present: !!brandLogoUrl },
      { label: 'Sponsor', present: !!brandSponsorUrl },
    ];
    for (const role of KIT_ROLES) {
      if (batchBrandKits[role.id] !== undefined) {
        items.push({ label: role.label, present: !!batchBrandKits[role.id] });
      }
    }
    return items;
  }, [brandLogoUrl, brandSponsorUrl, batchBrandKits]);

  return {
    brandAssets,
    brandLogoUrl,
    brandSponsorUrl,
    batchBrandKits,
  };
}
