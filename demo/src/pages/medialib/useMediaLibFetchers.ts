/**
 * useMediaLibFetchers — Data-fetching sub-hook for the Media Library.
 *
 * Owns brand-asset and member-media state + the two large fetch callbacks.
 *
 * Extracted from useMediaLibData.tsx during Phase 26 refactoring.
 */
import { useState, useCallback } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import type { BrandAsset } from '../../hooks/useBrandAssets';
import type { MemberMediaItem } from './medialibHelpers';

/** Brand profile shape from the API. */
interface BrandProfileRef {
  id: string | number;
  name?: string;
  project: string | number | null;
  project_type: string | null;
  project_name?: string | null;
  organisation_name?: string | null;
  parent_project_id?: string | number | null;
}

/** Project reference from the API. */
interface ProjectRef {
  id: string | number;
  name?: string;
  parent_id?: string | number | null;
}

/** Membership reference from the API. */
interface MembershipRef {
  id: string | number;
  user?: { name?: string; first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  /** Dynamic metadata — `any` kept for deeply nested TeamReel asset traversal. */
  metadata?: Record<string, any>;
  joined_at?: string;
  created_at?: string;
}

/* ------------------------------------------------------------------ */
/*  Params                                                             */
/* ------------------------------------------------------------------ */

export interface MediaLibFetcherParams {
    orgId: string | undefined;
    orgSlug: string | undefined;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useMediaLibFetchers(params: MediaLibFetcherParams) {
    const { orgId, orgSlug } = params;

    /* ---------- state --------------------------------------------- */
    const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
    const [brandLoading, setBrandLoading] = useState(false);
    const [brandError, setBrandError] = useState<string | null>(null);
    const [memberMedia, setMemberMedia] = useState<MemberMediaItem[]>([]);
    const [memberMediaLoading, setMemberMediaLoading] = useState(false);

    /* ============================================================== */
    /*  fetchAllBrandAssets                                             */
    /* ============================================================== */

    const fetchAllBrandAssets = useCallback(async () => {
        if (!orgId || !orgSlug) return;

        setBrandLoading(true);
        setBrandError(null);

        try {

            const allProfiles = await api.listAll<BrandProfileRef>('/branding/profiles/', { pageSize: 500, params: { organisation_scope: orgId } });

            const orgProfiles = allProfiles.filter((p) => !p.project);
            const clubProfiles = allProfiles.filter((p) => p.project_type === 'club');
            const teamProfiles = allProfiles.filter((p) => p.project_type === 'team');

            let allAssets: BrandAsset[] = [];
            try {
                const bulkData = await api.list<BrandAsset>('/branding/assets/', { pageSize: 500, params: { organisation_scope: orgId } });
                allAssets = bulkData.results;
            } catch (bulkErr) {
              logger.debug('Bulk assets fetch failed, using fallback', bulkErr);
            }

            // Fallback: if bulk endpoint returned 0 assets, fetch per-profile
            if (allAssets.length === 0 && allProfiles.length > 0) {
                const BATCH_SIZE = 10;
                for (let i = 0; i < allProfiles.length; i += BATCH_SIZE) {
                    const batch = allProfiles.slice(i, i + BATCH_SIZE);
                    const batchResults = await Promise.all(
                        batch.map(async (profile: BrandProfileRef) => {
                            try {
                                const data = await api.list<BrandAsset>(`/branding/profiles/${profile.id}/assets/`, { pageSize: 100 });
                                return data.results.map((a: BrandAsset) => ({
                                    ...a,
                                    profile_name: profile.name,
                                    project_id: profile.project
                                        ? String(profile.project)
                                        : undefined,
                                    project_name: profile.project_name ?? undefined,
                                    project_type: profile.project_type ?? null,
                                    parent_project_id: profile.parent_project_id
                                        ? String(profile.parent_project_id)
                                        : null,
                                    organisation_name: profile.organisation_name ?? undefined,
                                }));
                            } catch {
                                return [];
                            }
                        }),
                    );
                    allAssets.push(...batchResults.flat());
                }
            }

            const orgAssets = allAssets.filter(
                (a) => a.project_type === null || a.project_type === undefined,
            );
            const clubAssets = allAssets.filter((a) => a.project_type === 'club');
            const teamAssets = allAssets.filter((a) => a.project_type === 'team');

            setBrandAssets(allAssets);
        } catch (err: unknown) {
          logger.error('Failed to load brand assets', err);
            setBrandError(err instanceof Error ? err.message : 'Failed to load brand assets');
        } finally {
            setBrandLoading(false);
        }
    }, [orgId, orgSlug]);

    /* ============================================================== */
    /*  fetchMemberMediaItems                                          */
    /* ============================================================== */

    const fetchMemberMediaItems = useCallback(async () => {
        if (!orgSlug) return;

        setMemberMediaLoading(true);

        try {

            const allProjects = await api.listAll<ProjectRef>(`/organisations/${encodeURIComponent(orgSlug!)}/projects/`, { pageSize: 2000 });
            const teamProjects = allProjects.filter((p) => !!p.parent_id);

            const memberAssets: MemberMediaItem[] = [];

            const BATCH_SIZE = 5;
            let failedTeamCount = 0;
            const allMembershipData: { membership: MembershipRef; team: ProjectRef }[] = [];

            for (let i = 0; i < teamProjects.length; i += BATCH_SIZE) {
                const batch = teamProjects.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(
                    batch.map(async (team: ProjectRef) => {
                        try {
                            const data = await api.list<MembershipRef>(`/projects/${team.id}/members/`, { pageSize: 200 });
                            return data.results.map((m) => ({ membership: m, team }));
                        } catch {
                            failedTeamCount++;
                            return [];
                        }
                    }),
                );
                allMembershipData.push(...batchResults.flat());
            }

            if (allMembershipData.length > 0) {
                const sample = allMembershipData[0].membership;
            }

            for (const { membership, team } of allMembershipData) {
                const tr = membership.metadata?.teamreel_assets || {};
                const memberUser = membership.user || {};
                const memberName =
                    memberUser.name ||
                    `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                    memberUser.email ||
                    'Unknown';

                const addAsset = (assetType: string, url: string, kitType?: string) => {
                    if (!url) return;
                    memberAssets.push({
                        id: `${membership.id}-${assetType}${kitType ? `-${kitType}` : ''}`,
                        name: `${memberName} - ${assetType}${kitType ? ` (${kitType})` : ''}`,
                        url,
                        asset_type: `member_${assetType}`,
                        member_id: String(membership.id),
                        member_name: memberName,
                        project_id: String(team.id),
                        project_name: team.name || '',
                        parent_project_id: team.parent_id ? String(team.parent_id) : null,
                        kit_type: kitType,
                        created_at: membership.joined_at || membership.created_at,
                    });
                };

                if (tr?.media?.profile?.url) addAsset('profile', tr.media.profile.url);

                const fullbodyImages = tr?.images?.fullbody || {};
                for (const [kitType, url] of Object.entries(fullbodyImages)) {
                    if (url) addAsset('fullbody', url as string, kitType);
                }
                if (tr?.media?.kit?.url && !fullbodyImages['home']) {
                    addAsset('fullbody', tr.media.kit.url, 'home');
                }

                const closeupImages = tr?.images?.closeup || {};
                for (const [kitType, url] of Object.entries(closeupImages)) {
                    if (url) addAsset('closeup', url as string, kitType);
                }
                if (tr?.media?.closeup?.url && !closeupImages['home']) {
                    addAsset('closeup', tr.media.closeup.url, 'home');
                }

                const introVideos = tr?.videos?.intro || {};
                for (const [variant, url] of Object.entries(introVideos)) {
                    if (url) addAsset('intro_video', url as string, variant);
                }

                const celebrationVideos = tr?.videos?.celebration || {};
                for (const [variant, url] of Object.entries(celebrationVideos)) {
                    if (url) addAsset('celebration_video', url as string, variant);
                }
            }

            // Convert storage paths to presigned URLs
            const pathsToConvert = Array.from(
                new Set(
                    memberAssets
                        .map((a) => a.url)
                        .filter(
                            (url): url is string =>
                                Boolean(url) &&
                                !url.startsWith('http://') &&
                                !url.startsWith('https://'),
                        ),
                ),
            );

            if (pathsToConvert.length > 0) {
                try {
                    const chunks: string[][] = [];
                    for (let i = 0; i < pathsToConvert.length; i += 100) {
                        chunks.push(pathsToConvert.slice(i, i + 100));
                    }

                    const urlMap: Record<string, string | null> = {};
                    for (const chunk of chunks) {
                        try {
                            const headers: Record<string, string> = {};
                            if (orgId) headers['X-Organization-ID'] = orgId;
                            const presignedJson = await api.post<{ urls?: Record<string, string | null> }>('/files/presigned-urls/', { paths: chunk }, { headers });
                            const chunkMap = presignedJson?.urls || {};
                            Object.assign(urlMap, chunkMap);
                        } catch {
                            logger.debug('Presigned URL fetch failed for chunk');
                        }
                    }

                    for (const asset of memberAssets) {
                        if (!asset.url) continue;
                        const maybeUrl = urlMap[asset.url];
                        if (maybeUrl) asset.url = maybeUrl;
                    }

                } catch (presignErr) {
                    logger.debug('Presigned URL conversion error', presignErr);
                }
            }

            setMemberMedia(memberAssets);
        } catch (err) {
            logger.error('MediaLib: Failed to fetch member assets', err);
            setMemberMedia([]);
        } finally {
            setMemberMediaLoading(false);
        }
    }, [orgSlug]);

    /* ============================================================== */
    /*  Return                                                         */
    /* ============================================================== */

    return {
        brandAssets,
        brandLoading,
        brandError,
        memberMedia,
        memberMediaLoading,
        fetchAllBrandAssets,
        fetchMemberMediaItems,
    };
}
