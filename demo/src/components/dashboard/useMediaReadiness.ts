/**
 * useMediaReadiness — Computes media completeness across Club, Team, and Members.
 *
 * Fetches:
 * 1. Branding assets (organisation_scope) → separates club vs team assets
 * 2. Project members → member list
 * 3. Generative requests (completed, member type) → member media status
 *
 * Returns a typed hierarchy: { club, team, members, overall }.
 * All queries use TanStack Query with shared keys for dedup.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useContextSwitcher } from '@django-core/context-switcher';
import { api } from '@/api';
import type { BrandAsset } from '@/types/api/branding';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
import { queryKeys } from '../../utils/queryKeys';

// ─── Expected assets per hierarchy level ──────────────────

export const CLUB_ASSETS = [
  { key: 'logo', label: 'Club Logo', matchTypes: ['logo', 'logo_upload'] },
  { key: 'background', label: 'Achtergrond', matchTypes: ['stadium_background', 'club_background', 'club_background_upload'] },
] as const;

export const TEAM_ASSETS = [
  { key: 'kit_home', label: 'Thuistenue', matchTypes: ['kit_home', 'kit_home_upload', 'kit_home_combined'] },
  { key: 'kit_away', label: 'Uittenue', matchTypes: ['kit_away', 'kit_away_upload', 'kit_away_combined'] },
  { key: 'kit_goalkeeper', label: 'Keeperstenue', matchTypes: ['kit_goalkeeper', 'kit_goalkeeper_upload', 'kit_goalkeeper_combined'] },
  { key: 'sponsor', label: 'Sponsor Logo', matchTypes: ['sponsor_logo', 'sponsor_logo_upload'] },
] as const;

export const MEMBER_MEDIA_TYPES = [
  { key: 'profile_photo', label: 'Profielfoto' },
  { key: 'in_tenue', label: 'Tenue foto' },
  { key: 'closeup', label: 'Close-up' },
  { key: 'short_intro', label: 'Intro video' },
] as const;

// ─── Types ────────────────────────────────────────────────

export interface AssetStatus {
  key: string;
  label: string;
  present: boolean;
  /** The active BrandAsset if present */
  asset?: BrandAsset;
  /** Human-readable variant label (e.g. "AI Processed") */
  variantLabel?: string;
  /** Thumbnail URL if available */
  thumbnailUrl?: string;
}

export interface MemberMediaStatus {
  id: string;
  name: string;
  avatarUrl?: string;
  completedTypes: Set<string>;
  /** Number out of MEMBER_MEDIA_TYPES.length */
  completedCount: number;
  /** 0–100 */
  percent: number;
  isComplete: boolean;
}

export interface TierStatus {
  present: number;
  total: number;
  percent: number;
  assets: AssetStatus[];
}

export interface MediaReadiness {
  loading: boolean;
  club: TierStatus;
  team: TierStatus;
  members: {
    total: number;
    complete: number;
    percent: number;
    list: MemberMediaStatus[];
  };
  overallPercent: number;
}

// ─── Helpers ──────────────────────────────────────────────

/** Human label for the raw asset_type enum */
function variantLabel(assetType: string): string {
  if (assetType.endsWith('_combined')) return 'Gecombineerd';
  if (assetType.endsWith('_upload')) return 'Upload';
  if (assetType.includes('stadium')) return 'Stadionachtergrond';
  return 'AI verwerkt';
}

// ─── Hook ─────────────────────────────────────────────────

export function useMediaReadiness(): MediaReadiness {
  const { context } = useContextSwitcher();
  const org = context.organisation;
  const project = context.project;

  // 1. All brand assets for the organisation
  const { data: brandData, isLoading: brandLoading } = useQuery({
    queryKey: queryKeys.branding.assets(org?.slug || org?.id?.toString()),
    queryFn: () => api.list<BrandAsset>('/branding/assets/', {
      params: { organisation_scope: org!.slug || org!.id },
    }),
    enabled: !!org,
    staleTime: 15 * 60 * 1000,
  });

  // 2. Project members
  const { data: membersData, isLoading: membersLoading } = useProjectMembers(
    org?.slug,
    project?.slug,
  );

  // 3. Completed generative requests for member content
  const genFilters = useMemo(() => {
    if (!project) return undefined;
    return { status: 'completed', project: project.id } as Record<string, string>;
  }, [project?.id]);

  const { data: genData, isLoading: genLoading } = useGenerativeRequests(genFilters);

  const loading = brandLoading || membersLoading || genLoading;

  // ── Compute club & team asset status ──

  const { clubAssets, teamAssets } = useMemo(() => {
    const brandItems = brandData?.results ?? [];

    // Separate by project_type
    const clubItems = brandItems.filter(a => a.project_type === 'club' || !a.project_type);
    const teamItems = brandItems.filter(a => a.project_type === 'team');

    // Also include assets that belong to the current project specifically
    const currentProjectItems = project
      ? brandItems.filter(a => a.project_id === project.id)
      : [];

    function resolveAssets(
      expected: ReadonlyArray<{ key: string; label: string; matchTypes: ReadonlyArray<string> }>,
      pool: BrandAsset[],
    ): AssetStatus[] {
      return expected.map(ea => {
        // Find first active match
        const found = pool.find(
          a => ea.matchTypes.includes(a.asset_type) && a.is_active !== false,
        );
        return {
          key: ea.key,
          label: ea.label,
          present: !!found,
          asset: found,
          variantLabel: found ? variantLabel(found.asset_type) : undefined,
          thumbnailUrl: found?.url ?? undefined,
        };
      });
    }

    return {
      clubAssets: resolveAssets(CLUB_ASSETS, clubItems),
      teamAssets: resolveAssets(TEAM_ASSETS, [...teamItems, ...currentProjectItems]),
    };
  }, [brandData, project?.id]);

  // ── Compute member media progress ──

  const memberList = useMemo<MemberMediaStatus[]>(() => {
    const members = membersData?.results ?? [];
    const genItems = genData?.results ?? [];
    if (members.length === 0) return [];

    // Build member → completed subtypes map
    const memberContentMap = new Map<string, Set<string>>();
    for (const req of genItems as any[]) {
      const tplType = req.template?.template_type || '';
      if (tplType !== 'member') continue;
      const subtype = req.template?.template_subtype || req.input_data?.template_subtype || '';
      const memberIds: string[] = req.input_data?.member_ids || [];
      const singleMemberId = req.input_data?.member_id;
      const allIds = singleMemberId ? [singleMemberId, ...memberIds] : memberIds;
      for (const mid of allIds) {
        const key = String(mid);
        if (!memberContentMap.has(key)) memberContentMap.set(key, new Set());
        if (subtype) memberContentMap.get(key)!.add(subtype);
      }
    }

    const expected = MEMBER_MEDIA_TYPES.length;

    return members
      .map((m: any) => {
        const userId = String(m.user?.id || m.id);
        const memberId = String(m.id);
        const completed = memberContentMap.get(userId) || memberContentMap.get(memberId) || new Set<string>();
        const count = Math.min(completed.size, expected);
        const name = m.user?.first_name
          ? `${m.user.first_name} ${m.user.last_name || ''}`.trim()
          : m.user_name || m.name || 'Onbekend';
        return {
          id: memberId,
          name,
          avatarUrl: m.user?.avatar_url || m.avatar_url,
          completedTypes: completed,
          completedCount: count,
          percent: Math.round((count / expected) * 100),
          isComplete: count >= expected,
        };
      })
      .sort((a, b) => a.completedCount - b.completedCount);
  }, [membersData, genData]);

  // ── Aggregate stats ──

  const clubPresent = clubAssets.filter(a => a.present).length;
  const clubTotal = clubAssets.length;
  const clubPercent = clubTotal > 0 ? Math.round((clubPresent / clubTotal) * 100) : 0;

  const teamPresent = teamAssets.filter(a => a.present).length;
  const teamTotal = teamAssets.length;
  const teamPercent = teamTotal > 0 ? Math.round((teamPresent / teamTotal) * 100) : 0;

  const memberComplete = memberList.filter(m => m.isComplete).length;
  const memberTotal = memberList.length;
  const memberPercent = memberTotal > 0
    ? Math.round(
        (memberList.reduce((s, m) => s + m.percent, 0) / (memberTotal * 100)) * 100,
      )
    : 0;

  // Weighted overall: assets count less than member media
  const overallPercent = Math.round((clubPercent + teamPercent + memberPercent) / 3);

  return {
    loading,
    club: { present: clubPresent, total: clubTotal, percent: clubPercent, assets: clubAssets },
    team: { present: teamPresent, total: teamTotal, percent: teamPercent, assets: teamAssets },
    members: { total: memberTotal, complete: memberComplete, percent: memberPercent, list: memberList },
    overallPercent,
  };
}
