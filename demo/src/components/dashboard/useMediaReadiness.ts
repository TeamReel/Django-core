/**
 * useMediaReadiness — Computes media completeness across Club, Team, and Members.
 *
 * Fetches:
 * 1. Branding assets (organisation_scope) → separates club vs team assets
 * 2. Project members → member list (with metadata.teamreel_assets.media)
 *
 * Returns a typed hierarchy: { club, team, members, overall }.
 * All queries use TanStack Query with shared keys for dedup.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useContextSwitcher } from '@django-core/context-switcher';
import { api } from '@/api';
import type { BrandAsset } from '@/types/api/branding';
import { useAppSelection } from '../../hooks/useAppSelection';
import { useProjectMembers } from '../../hooks/useProjectMembers';
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
  { key: 'profile_photo', label: 'Profielfoto', metadataKey: 'fullbody' },
  { key: 'in_tenue', label: 'Tenue foto', metadataKey: 'kit' },
  { key: 'closeup', label: 'Close-up', metadataKey: 'closeup' },
  { key: 'short_intro', label: 'Intro video', metadataKey: 'intro' },
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
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;

  // 1. All brand assets for the organisation (page_size=500 to avoid pagination cutoff)
  const { data: brandData, isLoading: brandLoading } = useQuery({
    queryKey: queryKeys.branding.assets(org?.slug || org?.id?.toString()),
    queryFn: () => api.list<BrandAsset>('/branding/assets/', {
      params: { organisation_scope: org!.slug || org!.id, page_size: 500 },
    }),
    enabled: !!org,
    staleTime: 15 * 60 * 1000,
  });

  // 2. Project members (includes metadata.teamreel_assets.media per member)
  const { data: membersData, isLoading: membersLoading } = useProjectMembers(
    projectId,
  );

  const loading = brandLoading || membersLoading;

  // ── Compute club & team asset status ──

  const { clubAssets, teamAssets } = useMemo(() => {
    const brandItems = brandData?.results ?? [];
    const pid = projectId != null ? String(projectId) : undefined;

    // Determine club/team scoping from brand data
    const currentAsset = pid
      ? brandItems.find(a => a.project_id === pid)
      : undefined;
    const isTeam = currentAsset?.project_type === 'team';
    const clubId = isTeam
      ? (currentAsset?.parent_project_id ?? undefined)
      : currentAsset?.project_type === 'club'
        ? pid
        : undefined;
    const teamId = isTeam ? pid : undefined;

    // Club assets: scoped to parent club + org-level defaults (null project_id)
    const clubItems = clubId
      ? brandItems.filter(a =>
          a.project_id === clubId || (!a.project_type && !a.project_id),
        )
      : brandItems.filter(a => a.project_type === 'club' || !a.project_type);

    // Team assets: scoped to current team + inherited from parent club
    const teamItems = teamId
      ? brandItems.filter(a =>
          a.project_id === teamId || (clubId != null && a.project_id === clubId),
        )
      : brandItems.filter(a => a.project_type === 'team');

    function resolveAssets(
      expected: ReadonlyArray<{ key: string; label: string; matchTypes: ReadonlyArray<string> }>,
      pool: BrandAsset[],
    ): AssetStatus[] {
      return expected.map(ea => {
        // Prefer processed (non-upload) assets over raw uploads
        const processedTypes = ea.matchTypes.filter(t => !t.endsWith('_upload'));
        const uploadTypes = ea.matchTypes.filter(t => t.endsWith('_upload'));

        const found =
          pool.find(a => processedTypes.includes(a.asset_type) && a.is_active !== false) ??
          pool.find(a => uploadTypes.includes(a.asset_type) && a.is_active !== false);

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
      teamAssets: resolveAssets(TEAM_ASSETS, teamItems),
    };
  }, [brandData, projectId]);

  // ── Compute member media progress ──

  const memberList = useMemo<MemberMediaStatus[]>(() => {
    const rawMembers = membersData?.results ?? [];
    if (rawMembers.length === 0) return [];

    // Deduplicate members by user ID — prefer entries with a period set
    const byUserId = new Map<number | string, typeof rawMembers[0]>();
    for (const m of rawMembers) {
      const uid = m.user?.id ?? m.id;
      const existing = byUserId.get(uid);
      if (!existing || (m.period && !existing.period)) {
        byUserId.set(uid, m);
      }
    }
    const members = Array.from(byUserId.values());

    const expected = MEMBER_MEDIA_TYPES.length;

    return members
      .map((m) => {
        const memberId = String(m.id);

        // Read media completeness from metadata.teamreel_assets.media
        const meta = m.metadata as Record<string, unknown> | undefined;
        const teamreelAssets = meta?.teamreel_assets as Record<string, unknown> | undefined;
        const media = teamreelAssets?.media as Record<string, unknown> | undefined;

        const completed = new Set<string>();
        for (const mt of MEMBER_MEDIA_TYPES) {
          const entry = media?.[mt.metadataKey] as Record<string, unknown> | undefined;
          if (entry?.url) {
            completed.add(mt.key);
          }
        }

        const count = Math.min(completed.size, expected);
        const name = m.user?.first_name
          ? `${m.user.first_name} ${m.user.last_name ?? ''}`.trim()
          : 'Onbekend';
        return {
          id: memberId,
          name,
          avatarUrl: m.user?.avatar_url ?? undefined,
          completedTypes: completed,
          completedCount: count,
          percent: Math.round((count / expected) * 100),
          isComplete: count >= expected,
        };
      })
      .sort((a, b) => a.completedCount - b.completedCount);
  }, [membersData]);

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
