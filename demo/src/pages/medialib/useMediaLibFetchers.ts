/**
 * useMediaLibFetchers — Data-fetching sub-hook for the Media Library.
 *
 * Owns brand-asset and member-media state + the two large fetch callbacks.
 *
 * Extracted from useMediaLibData.tsx during Phase 26 refactoring.
 */
import { useState, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import type { BrandAsset } from '../../hooks/useBrandAssets';
import type { MemberMediaItem } from './medialibHelpers';

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
            const apiBaseUrl = getApiBaseUrl();

            const fetchPaginated = async <T,>(url: string): Promise<T[]> => {
                const all: T[] = [];
                let nextUrl: string | null = url;
                while (nextUrl) {
                    const res: Response = await fetch(nextUrl, { credentials: 'include' });
                    if (!res.ok) {
                        console.warn('[MediaLib] Fetch failed:', url, res.status);
                        break;
                    }
                    const json: Record<string, any> = await res.json();
                    const items: T[] = Array.isArray(json.data?.results)
                        ? json.data.results
                        : Array.isArray(json.data)
                          ? json.data
                          : Array.isArray(json.results)
                            ? json.results
                            : Array.isArray(json)
                              ? json
                              : [];
                    all.push(...items);
                    nextUrl =
                        json.data?.next || json.meta?.pagination?.next || json.next || null;
                }
                return all;
            };

            const allProfiles = await fetchPaginated<any>(
                `${apiBaseUrl}/api/v1/branding/profiles/?organisation_scope=${orgId}&page_size=500`,
            );

            const orgProfiles = allProfiles.filter((p: any) => !p.project);
            const clubProfiles = allProfiles.filter((p: any) => p.project_type === 'club');
            const teamProfiles = allProfiles.filter((p: any) => p.project_type === 'team');

            let allAssets: BrandAsset[] = [];
            try {
                const bulkUrl = `${apiBaseUrl}/api/v1/branding/assets/?organisation_scope=${orgId}&page_size=500`;
                const bulkRes = await fetch(bulkUrl, { credentials: 'include' });

                if (bulkRes.ok) {
                    const bulkJson = await bulkRes.json();
                    allAssets = Array.isArray(bulkJson.data?.results)
                        ? bulkJson.data.results
                        : Array.isArray(bulkJson.data)
                          ? bulkJson.data
                          : Array.isArray(bulkJson.results)
                            ? bulkJson.results
                            : Array.isArray(bulkJson)
                              ? bulkJson
                              : [];
                }
            } catch (bulkErr) {
              console.error(bulkErr);
                console.warn(
                    '[MediaLib] Bulk assets fetch failed, using fallback:',
                    bulkErr,
                );
            }

            // Fallback: if bulk endpoint returned 0 assets, fetch per-profile
            if (allAssets.length === 0 && allProfiles.length > 0) {
                const BATCH_SIZE = 10;
                for (let i = 0; i < allProfiles.length; i += BATCH_SIZE) {
                    const batch = allProfiles.slice(i, i + BATCH_SIZE);
                    const batchResults = await Promise.all(
                        batch.map(async (profile: any) => {
                            try {
                                const res = await fetch(
                                    `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/assets/?page_size=100`,
                                    { credentials: 'include' },
                                );
                                if (!res.ok) return [];
                                const json = await res.json();
                                const assets: BrandAsset[] = Array.isArray(json.data?.results)
                                    ? json.data.results
                                    : Array.isArray(json.data)
                                      ? json.data
                                      : Array.isArray(json.results)
                                        ? json.results
                                        : Array.isArray(json)
                                          ? json
                                          : [];
                                return assets.map((a: BrandAsset) => ({
                                    ...a,
                                    profile_name: profile.name,
                                    project_id: profile.project
                                        ? String(profile.project)
                                        : undefined,
                                    project_name: profile.project_name ?? null,
                                    project_type: profile.project_type ?? null,
                                    parent_project_id: profile.parent_project_id
                                        ? String(profile.parent_project_id)
                                        : null,
                                    organisation_name: profile.organisation_name ?? null,
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
                (a: any) => a.project_type === null || a.project_type === undefined,
            );
            const clubAssets = allAssets.filter((a: any) => a.project_type === 'club');
            const teamAssets = allAssets.filter((a: any) => a.project_type === 'team');

            setBrandAssets(allAssets);
        } catch (err: unknown) {
          console.error(err);
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
            const apiBaseUrl = getApiBaseUrl();

            const fetchPaginated = async <T,>(url: string): Promise<T[]> => {
                const all: T[] = [];
                let nextUrl: string | null = url;
                while (nextUrl) {
                    const res: Response = await fetch(nextUrl, { credentials: 'include' });
                    if (!res.ok) break;
                    const json: Record<string, any> = await res.json();
                    const items: T[] = Array.isArray(json.data?.results)
                        ? json.data.results
                        : Array.isArray(json.data)
                          ? json.data
                          : Array.isArray(json.results)
                            ? json.results
                            : Array.isArray(json)
                              ? json
                              : [];
                    all.push(...items);
                    nextUrl =
                        json.data?.next || json.meta?.pagination?.next || json.next || null;
                }
                return all;
            };

            const allProjects = await fetchPaginated<any>(
                `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000`,
            );
            const teamProjects = allProjects.filter((p: any) => !!p.parent_id);

            const memberAssets: MemberMediaItem[] = [];

            const BATCH_SIZE = 5;
            let failedTeamCount = 0;
            const allMembershipData: { membership: any; team: any }[] = [];

            for (let i = 0; i < teamProjects.length; i += BATCH_SIZE) {
                const batch = teamProjects.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(
                    batch.map(async (team: any) => {
                        try {
                            const res = await fetch(
                                `${apiBaseUrl}/api/v1/projects/${team.id}/members/?page_size=200`,
                                { credentials: 'include' },
                            );
                            if (!res.ok) {
                                failedTeamCount++;
                                return [];
                            }
                            const json = await res.json();
                            const memberships: any[] = Array.isArray(json.data?.results)
                                ? json.data.results
                                : Array.isArray(json.data)
                                  ? json.data
                                  : Array.isArray(json.results)
                                    ? json.results
                                    : Array.isArray(json)
                                      ? json
                                      : [];
                            return memberships.map((m: any) => ({ membership: m, team }));
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
                        member_id: membership.id,
                        member_name: memberName,
                        project_id: String(team.id),
                        project_name: team.name,
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
                    const csrfToken = getCsrfToken();

                    const chunks: string[][] = [];
                    for (let i = 0; i < pathsToConvert.length; i += 100) {
                        chunks.push(pathsToConvert.slice(i, i + 100));
                    }

                    const urlMap: Record<string, string | null> = {};
                    for (const chunk of chunks) {
                        const presignedRes = await fetch(
                            `${apiBaseUrl}/api/v1/files/presigned-urls/`,
                            {
                                method: 'POST',
                                credentials: 'include',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                                },
                                body: JSON.stringify({ paths: chunk }),
                            },
                        );

                        if (!presignedRes.ok) {
                            console.warn(
                                '[MediaLib] Presigned URL fetch failed:',
                                presignedRes.status,
                            );
                            continue;
                        }

                        const presignedJson = await presignedRes.json();
                        const chunkMap =
                            presignedJson.data?.urls || presignedJson.urls || {};
                        Object.assign(urlMap, chunkMap);
                    }

                    for (const asset of memberAssets) {
                        if (!asset.url) continue;
                        const maybeUrl = urlMap[asset.url];
                        if (maybeUrl) asset.url = maybeUrl;
                    }

                } catch (presignErr) {
                  console.error(presignErr);
                    console.warn(
                        '[MediaLib] Presigned URL conversion error:',
                        presignErr,
                    );
                }
            }

            setMemberMedia(memberAssets);
        } catch (err) {
          console.error(err);
            console.error('[MediaLib] Failed to fetch member assets:', err);
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
