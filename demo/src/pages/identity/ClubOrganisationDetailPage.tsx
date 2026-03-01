import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Input } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader, type BreadcrumbSwitcherOption } from '@django-core/page-templates';

import { fetchAllPages } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { getApiBaseUrl } from '../../utils/apiBase';
import { actionButtonStyle } from '../../utils/directoryStyles';

import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import TeamCreditsTab from './detail/TeamCreditsTab';
import ClubAssetsTab from './detail/ClubAssetsTab';
import MobileTabBar from '../../components/MobileTabBar';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import ContentAvailabilityCard from '../../components/FeatureFlags/ContentAvailabilityCard';
import BrandIdentityPage from '../../components/Branding/BrandIdentityPage';
import { ClubOverviewTab } from './ClubOverviewTab';
import { ClubHierarchyTab } from './ClubHierarchyTab';
import { isSeasonPeriod, isCompetitionPeriod } from './orgDetailUtils';
import { AssetsTab } from '../../components/AssetsTab';
import { AssetCompletionMatrix } from '../../components/AssetCompletionMatrix';

type Organisation = {
  id: string;
  name: string;
  slug?: string;
};

type Project = {
  id: string;
  name: string;
  slug?: string;
  organisation_id?: string;
  organisation?: { id?: string; slug?: string };
};

type Period = {
  id: string;
  name: string;
  slug?: string;
  project_id?: string | number;
  project?: { id?: string | number };
  parent_period_id?: string | number | null;
  parent_period?: { id?: string | number } | null;
  type?: string;
  data?: any;
  metadata?: any;
};

type OverviewMember = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

const unwrapEnvelope = <T,>(raw: any): T => (raw?.data ?? raw) as T;

const getCsrfToken = (): string => {
  try {
    return (
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] ||
      ''
    );
  } catch {
    return '';
  }
};

const extractList = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  if (Array.isArray(raw?.data?.results)) return raw.data.results;
  return [];
};

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
  return false;
};

const getTeamParentId = (t: any): string => {
  const parent =
    (t as any)?.parent_id ??
    (t as any)?.parent_project_id ??
    (typeof (t as any)?.parent_project === 'object' ? (t as any)?.parent_project?.id : (t as any)?.parent_project) ??
    (typeof (t as any)?.parent === 'object' ? (t as any)?.parent?.id : (t as any)?.parent);
  return parent != null ? String(typeof parent === 'object' ? parent.id : parent) : '';
};

// Kit types for the Kits tab
const KIT_TYPES = [
  { id: 'kit_home', label: 'Home Kit', description: 'Primary home match kit' },
  { id: 'kit_away', label: 'Away Kit', description: 'Away match kit' },
  { id: 'kit_third', label: 'Third Kit', description: 'Alternative third kit' },
  { id: 'kit_goalkeeper', label: 'Goalkeeper Kit', description: 'Goalkeeper specific kit' },
  { id: 'kit_coach', label: 'Coach Kit', description: 'Coaching staff kit' },
  { id: 'kit_assistant', label: 'Assistant Kit', description: 'Assistant staff kit' },
  { id: 'kit_training', label: 'Training Kit', description: 'Training and practice kit' },
  { id: 'kit_legacy', label: 'Legacy Kit', description: 'Legacy / retro kit' },
] as const;

type KitAsset = {
  id: string;
  asset_type: string;
  url?: string;
  alt_text?: string;
  file_details?: {
    id: string;
    name: string;
    size: number;
    content_type: string;
  };
};

/**
 * Club Kits Tab - displays and manages kit/tenue assets for the club
 */
function ClubKitsTab({
  club,
  apiBaseUrl,
  brandProfileId,
  orgId,
  onKitUploaded,
}: {
  club: Project;
  apiBaseUrl: string;
  brandProfileId: string | null;
  orgId: string;
  onKitUploaded?: () => void;
}) {
  const [kits, setKits] = useState<KitAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedKitType, setSelectedKitType] = useState<string | null>(null);

  // Load kit assets from brand profile
  const loadKits = React.useCallback(async () => {
    if (!brandProfileId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/branding/assets/?profile=${brandProfileId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to load assets: ${res.status}`);
      }
      const json = await res.json();
      const assets = json?.data?.results || json?.data || json?.results || [];
      const assetList = Array.isArray(assets) ? assets : [];

      // Filter to only kit assets
      const kitAssets = assetList.filter((a: any) =>
        String(a.asset_type || '').startsWith('kit_')
      );

      setKits(kitAssets);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load kits');
      setLoading(false);
    }
  }, [apiBaseUrl, brandProfileId]);

  useEffect(() => {
    let cancelled = false;

    const doLoad = async () => {
      if (!cancelled) {
        await loadKits();
      }
    };

    void doLoad();
    return () => {
      cancelled = true;
    };
  }, [loadKits]);

  // Handle kit upload
  const handleUpload = async (file: File, kitTypeId: string) => {
    if (!brandProfileId || !orgId || !club?.slug) {
      setError('No brand profile, organization or club slug available');
      return;
    }

    setUploadingType(kitTypeId);
    setError(null);

    try {
      // Step 1: Upload file to FileAsset API with path_prefix for organized S3 structure
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');

      // Use path_prefix to organize kits in S3: kits/{club_slug}/{kit_type}/
      const pathPrefix = `kits/${club.slug}/${kitTypeId}`;
      const fileRes = await fetch(`${apiBaseUrl}/api/v1/files/?path_prefix=${encodeURIComponent(pathPrefix)}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Organization-ID': orgId,
          'X-CSRFToken': getCsrfToken(),
        },
        body: formData,
      });

      if (!fileRes.ok) {
        const errText = await fileRes.text();
        throw new Error(`File upload failed: ${fileRes.status} - ${errText}`);
      }

      const fileData = await fileRes.json();
      const fileId = fileData?.data?.id || fileData?.id;

      if (!fileId) {
        throw new Error('No file ID returned from upload');
      }

      // Step 2: Check if a BrandAsset already exists for this type
      const existingKit = kits.find((k) => k.asset_type === kitTypeId);

      if (existingKit) {
        // Update existing asset with new file
        const updateRes = await fetch(`${apiBaseUrl}/api/v1/branding/assets/${existingKit.id}/`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({
            file: fileId,
          }),
        });

        if (!updateRes.ok) {
          throw new Error(`Failed to update brand asset: ${updateRes.status}`);
        }
      } else {
        // Create new BrandAsset linking to the uploaded file
        const assetRes = await fetch(`${apiBaseUrl}/api/v1/branding/assets/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({
            profile: brandProfileId,
            file: fileId,
            asset_type: kitTypeId,
            alt_text: `${club.name} ${KIT_TYPES.find((t) => t.id === kitTypeId)?.label || kitTypeId}`,
            is_active: true,
          }),
        });

        if (!assetRes.ok) {
          const errText = await assetRes.text();
          throw new Error(`Failed to create brand asset: ${assetRes.status} - ${errText}`);
        }
      }

      // Reload kits
      await loadKits();
      onKitUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingType(null);
      setSelectedKitType(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedKitType) {
      void handleUpload(file, selectedKitType);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerUpload = (kitTypeId: string) => {
    setSelectedKitType(kitTypeId);
    fileInputRef.current?.click();
  };

  const getKitForType = (typeId: string): KitAsset | undefined => {
    return kits.find((k) => k.asset_type === typeId);
  };

  const getKitImageUrl = (kit: KitAsset | undefined): string | null => {
    if (!kit?.url) return null;
    if (kit.url.startsWith('http')) return kit.url;
    return `https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/${kit.url}`;
  };

  if (loading) {
    return (
      <Card className="p-24">
        <div className="text-center text-muted">
          Loading kits...
        </div>
      </Card>
    );
  }

  if (!brandProfileId) {
    return (
      <Card className="p-24">
        <Alert variant="warning">
          No brand profile found for this club. Create a brand profile on the Identity tab first to manage kits.
        </Alert>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-24">
        <h3 className="m-0 mb-8">Club Kits / Tenues</h3>
        <p className="text-muted fs-13 mb-24">
          Manage your club's kit designs for different roles and occasions.
        </p>

        {error && (
          <Alert variant="error" className="mb-16">
            {error}
          </Alert>
        )}

        <div className="grid gap-20" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {KIT_TYPES.map((kitType) => {
            const kit = getKitForType(kitType.id);
            const imageUrl = getKitImageUrl(kit);

            return (
              <div
                key={kitType.id}
                className="border rounded-12 p-16 bg-surface"
              >
                <div className="fw-600 mb-4">{kitType.label}</div>
                <div className="fs-12 text-muted mb-16">
                  {kitType.description}
                </div>

                <div
                  className="w-full rounded-8 flex-center overflow-hidden mb-12"
                  style={{
                    aspectRatio: '3/4',
                    backgroundColor: 'var(--app-surface-secondary)',
                  }}
                >
                  {uploadingType === kitType.id ? (
                    <div className="text-center text-muted">
                      <div className="mb-8 fs-24">⏳</div>
                      <div className="fs-12">Uploading...</div>
                    </div>
                  ) : imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={kitType.label}
                      className="w-full h-full"
                      style={{ objectFit: 'contain' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted">
                      <div className="mb-8" style={{ fontSize: 48, opacity: 0.3 }}>👕</div>
                      <div className="fs-12">No image uploaded</div>
                    </div>
                  )}
                </div>

                <div className="flex-row gap-8">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={uploadingType === kitType.id}
                    onClick={() => triggerUpload(kitType.id)}
                  >
                    {uploadingType === kitType.id ? 'Uploading...' : kit ? 'Replace' : 'Upload'}
                  </Button>
                  {kit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (imageUrl) {
                          window.open(imageUrl, '_blank');
                        }
                      }}
                    >
                      View
                    </Button>
                  )}
                </div>

                {kit && (
                  <div className="mt-8 fs-11 text-muted">
                    <strong>File:</strong> {kit.file_details?.name || 'Unknown'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hidden file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </Card>

      <Card className="p-24">
        <h4 className="m-0 mb-8">How to add kits</h4>
        <p className="text-muted fs-13 mb-12">
          Kit images should be high-quality photos or renders showing the complete kit design.
          Recommended image size: 600x800 pixels (3:4 aspect ratio).
        </p>
        <ul className="m-0 text-muted fs-13" style={{ paddingLeft: 20 }}>
          <li>Use PNG or JPEG format for best quality</li>
          <li>Include front view of the full kit (shirt, shorts, socks)</li>
          <li>Keep background transparent or neutral for cleaner display</li>
          <li>Upload separate images for each kit variant</li>
        </ul>
      </Card>
    </div>
  );
}

export default function ClubOrganisationDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const apiBaseUrl = getApiBaseUrl();

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(projectId || '').trim();

  // API lookup for organisations uses slug (not UUID). If we land on a UUID URL,
  // resolve it via the organisations list (which contains both id + slug).
  const [resolvedOrgSlug, setResolvedOrgSlug] = useState<string>('');
  const effectiveOrgSlug = useMemo(() => {
    const explicit = String(resolvedOrgSlug || '').trim();
    if (explicit) return explicit;
    const raw = String(orgSlugOrId || '').trim();
    return looksLikeIdentifier(raw) ? '' : raw;
  }, [orgSlugOrId, resolvedOrgSlug]);

  const [org, setOrg] = useState<Organisation | null>(null);
  const [club, setClub] = useState<Project | null>(null);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hierarchyTeams, setHierarchyTeams] = useState<Project[]>([]);
  const [hierarchySeasonsByTeamId, setHierarchySeasonsByTeamId] = useState<Record<string, Period[]>>({});
  const [hierarchyCompetitionsCountByTeamId, setHierarchyCompetitionsCountByTeamId] = useState<Record<string, number>>({});
  const [hierarchyMatchesCountByTeamId, setHierarchyMatchesCountByTeamId] = useState<Record<string, number>>({});
  const [hierarchyCompetitionsCountBySeasonId, setHierarchyCompetitionsCountBySeasonId] = useState<Record<string, number>>({});
  const [hierarchyMatchesCountBySeasonId, setHierarchyMatchesCountBySeasonId] = useState<Record<string, number>>({});
  const [hierarchyMembersCountByTeamId, setHierarchyMembersCountByTeamId] = useState<Record<string, number>>({});
  const [hierarchyMembersCountForClub, setHierarchyMembersCountForClub] = useState<number | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);

  const [hierarchySearch, setHierarchySearch] = useState('');

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewTeams, setOverviewTeams] = useState<Project[]>([]);
  const [overviewSeasons, setOverviewSeasons] = useState<Period[]>([]);
  const [overviewMembers, setOverviewMembers] = useState<OverviewMember[]>([]);
  const [overviewCounts, setOverviewCounts] = useState<{ teams: number; seasons: number; members: number } | null>(null);

  // Brand identity state for club logo
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);

  const [orgClubsForSwitcher, setOrgClubsForSwitcher] = useState<Project[]>([]);
  const [orgClubsForSwitcherLoading, setOrgClubsForSwitcherLoading] = useState(false);

  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
    // Back-compat: older club detail pages used `people`/`users`.
    const normalized = tab === 'people' || tab === 'users' ? 'members' : tab;
    const allowed = new Set([
      'overview',
      'hierarchy',
      'teams',
      'seasons',
      'competitions',
      'matches',
      'members',
      'media',
      'assets',
      'balance',
      'transactions',
      'identity',
      'kits',
      'settings',
    ]);
    return allowed.has(normalized) ? normalized : 'overview';
  }, [location.search]);

  const makeTabHref = (tabId: string): string => {
    const params = new URLSearchParams(location.search);
    const t = String(tabId || '').trim().toLowerCase();
    const normalized = t === 'people' || t === 'users' ? 'members' : t;
    if (!normalized || normalized === 'overview') params.delete('tab');
    else params.set('tab', normalized);
    const qs = params.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  };

  // Load active context
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) {
          setActiveContextState(context);
        }
      } catch (error) {
        console.error('Failed to load active context:', error);
      }
    };
    void loadActiveContext();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!orgSlugOrId || !clubSlugOrId) {
          throw new Error('Missing organisation or club identifier.');
        }

        if (!effectiveOrgSlug) {
          // Resolve UUID -> slug.
          const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=250`, { credentials: 'include' });
          if (!res.ok) throw new Error(`Failed to resolve organisation (${res.status})`);
          const json = await res.json().catch(() => null);
          const raw = unwrapEnvelope<any>(json);
          const list: any[] = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
          const match = list.find((o: any) => String(o?.id || '') === String(orgSlugOrId));
          const slug = String(match?.slug || '').trim();
          if (!slug) throw new Error('Organisation not found');
          if (cancelled) return;
          setResolvedOrgSlug(slug);
          return;
        }

        const [orgRes, clubRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/`, {
            credentials: 'include',
          }),
          fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' },
          ),
        ]);

        if (!orgRes.ok) throw new Error(`Failed to load organisation (${orgRes.status})`);
        if (!clubRes.ok) throw new Error(`Failed to load club (${clubRes.status})`);

        const orgJson = await orgRes.json().catch(() => null);
        const clubJson = await clubRes.json().catch(() => null);

        const loadedOrg = unwrapEnvelope<Organisation>(orgJson);
        const loadedClub = unwrapEnvelope<Project>(clubJson);

        if (cancelled) return;
        setOrg(loadedOrg);
        setClub(loadedClub);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load club');
        setOrg(null);
        setClub(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, orgSlugOrId, clubSlugOrId, effectiveOrgSlug]);

  const orgIdForDirectoryLists = useMemo(() => {
    const id = String(org?.id || '').trim();
    return id;
  }, [org?.id]);

  // Directory lists (and most API routes) must use org slug.
  const orgSlugForDirectoryLists = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug;
  }, [org?.slug, resolvedOrgSlug]);

  const clubIdForDirectoryLists = useMemo(() => {
    const id = String(club?.id || '').trim();
    return id;
  }, [club?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      if (activeTabFromUrl !== 'overview') return;
      const orgSlug = String(orgSlugForDirectoryLists || '').trim();
      const clubId = String(clubIdForDirectoryLists || '').trim();
      if (!orgSlug || !clubId) return;

      setOverviewLoading(true);
      setOverviewError(null);

      try {
        // 1) Teams (under this club)
        const teamsRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
          { credentials: 'include' },
        );
        if (!teamsRes.ok) throw new Error(`Failed to load teams (${teamsRes.status})`);
        const teamsJson = await teamsRes.json().catch(() => null);
        const teamsRaw = unwrapEnvelope<any>(teamsJson);
        const teamsList: any[] = Array.isArray(teamsRaw?.results) ? teamsRaw.results : Array.isArray(teamsRaw) ? teamsRaw : [];
        const clubTeams: Project[] = (teamsList || [])
          .filter((t: any) => String(getTeamParentId(t) || '') === String(clubId))
          .map((t: any) => ({
            id: String(t?.id || '').trim(),
            name: String(t?.name || 'Team'),
            slug: t?.slug ? String(t.slug) : undefined,
            organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined,
            organisation: t?.organisation,
          }))
          .filter((t) => Boolean(t.id));

        // 2) Seasons (across those teams)
        const teamIds = clubTeams.map((t) => String(t.id)).filter(Boolean);
        let mergedSeasons: any[] = [];
        if (teamIds.length > 0) {
          const chunkSize = 50;
          const chunks: string[][] = [];
          for (let i = 0; i < teamIds.length; i += chunkSize) chunks.push(teamIds.slice(i, i + chunkSize));

          const seasonsChunks = await Promise.all(
            chunks.map(async (chunk) => {
              const params = new URLSearchParams();
              params.set('project_id__in', chunk.join(','));
              params.set('page_size', '500');

              const typed = new URLSearchParams(params);
              typed.set('type', 'season');

              const typedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${typed.toString()}`, { credentials: 'include' });
              if (!typedRes.ok) throw new Error(`Failed to load seasons (${typedRes.status})`);
              const typedJson = await typedRes.json().catch(() => null);
              const typedRaw = unwrapEnvelope<any>(typedJson);
              const typedList: any[] = extractList(typedRaw);
              if (typedList.length > 0) return typedList;

              const untypedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
              if (!untypedRes.ok) throw new Error(`Failed to load seasons (${untypedRes.status})`);
              const untypedJson = await untypedRes.json().catch(() => null);
              const untypedRaw = unwrapEnvelope<any>(untypedJson);
              const untypedList: any[] = extractList(untypedRaw);
              return untypedList.filter(isSeasonPeriod);
            }),
          );

          mergedSeasons = mergeUniqueById(seasonsChunks.flat() as any[]);
        }

        // 3) Members (org members filtered by club/team memberships)
        const memberParams = new URLSearchParams();
        memberParams.set('page_size', '250');
        memberParams.set('include_project_memberships', 'true');
        memberParams.set('include_project_membership_details', 'true');
        const membersRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/?${memberParams.toString()}`,
          { credentials: 'include' },
        );
        if (!membersRes.ok) throw new Error(`Failed to load members (${membersRes.status})`);
        const membersJson = await membersRes.json().catch(() => null);
        const membersRawList =
          membersJson?.data?.data || membersJson?.data?.results || membersJson?.results || membersJson?.data || [];
        const membersList: any[] = Array.isArray(membersRawList) ? membersRawList : [];

        const isMemberInClub = (item: any): boolean => {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          const memberships = item?.project_memberships || u?.project_memberships || [];
          if (!Array.isArray(memberships) || memberships.length === 0) return false;
          return memberships.some((m: any) => {
            const projectId = String(m?.project_id ?? m?.project?.id ?? '');
            const parentId = String(m?.project?.parent_id ?? m?.project?.parent_project_id ?? '');
            return projectId === String(clubId) || parentId === String(clubId);
          });
        };

        const normalizedMembers: OverviewMember[] = membersList
          .filter(isMemberInClub)
          .map((item: any) => {
            const nestedUser = item?.user;
            const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
            return {
              id: String(u?.id ?? item?.id ?? '').trim(),
              email: u?.email,
              first_name: u?.first_name,
              last_name: u?.last_name,
            };
          })
          .filter((u) => Boolean(u.id));

        if (cancelled) return;

        const sortedTeams = [...clubTeams].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        const sortedSeasons = [...(mergedSeasons as Period[])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        const sortedMembers = [...normalizedMembers].sort((a, b) => {
          const an = `${a?.last_name || ''} ${a?.first_name || ''} ${a?.email || ''}`.trim();
          const bn = `${b?.last_name || ''} ${b?.first_name || ''} ${b?.email || ''}`.trim();
          return an.localeCompare(bn);
        });

        setOverviewTeams(sortedTeams.slice(0, 6));
        setOverviewSeasons(sortedSeasons.slice(0, 6));
        setOverviewMembers(sortedMembers.slice(0, 6));
        setOverviewCounts({ teams: clubTeams.length, seasons: sortedSeasons.length, members: sortedMembers.length });
      } catch (e) {
        if (cancelled) return;
        setOverviewError(e instanceof Error ? e.message : 'Failed to load overview');
        setOverviewTeams([]);
        setOverviewSeasons([]);
        setOverviewMembers([]);
        setOverviewCounts(null);
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists, orgSlugForDirectoryLists]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (activeTabFromUrl !== 'hierarchy') return;
      const clubId = String(clubIdForDirectoryLists || '').trim();
      if (!clubId) return;

      try {
        const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(clubId)}/members/?page_size=1`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load club members');
        const json = await res.json().catch(() => null);
        const count = extractCount(json);
        if (!cancelled) setHierarchyMembersCountForClub(count);
      } catch {
        if (!cancelled) setHierarchyMembersCountForClub(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists]);

  // Load brand profile logo when identity or kits tab is active
  useEffect(() => {
    let cancelled = false;

    const loadBrandLogo = async () => {
      // Load for both identity and kits tabs
      if (activeTabFromUrl !== 'identity' && activeTabFromUrl !== 'kits') return;

      // We need the project ID to query branding. Get it from the club data.
      const projectId = club?.id;
      if (!projectId) {
        console.log('No project ID available for brand logo load');
        return;
      }

      try {
        // Step 1: Get the brand profile list for this project to find profile ID
        const profileListRes = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/?project=${projectId}`, {
          credentials: 'include',
        });
        if (!profileListRes.ok) {
          console.log('Brand profile list fetch failed:', profileListRes.status);
          return;
        }
        const profileListJson = await profileListRes.json().catch(() => null);
        console.log('Brand profile list response:', profileListJson);

        // Get profile ID from list response
        const profileListData = profileListJson?.data;
        let profileId: string | null = null;

        if (profileListData?.results && Array.isArray(profileListData.results) && profileListData.results.length > 0) {
          profileId = profileListData.results[0]?.id;
        } else if (profileListData?.id) {
          profileId = profileListData.id;
        } else if (Array.isArray(profileListData) && profileListData.length > 0) {
          profileId = profileListData[0]?.id;
        }

        if (!profileId) {
          console.log('No brand profile found for project', projectId);
          return;
        }

        // Store the brand profile ID for use by other tabs (like Kits)
        if (!cancelled) {
          setBrandProfileId(profileId);
        }

        // Step 2: Fetch the profile DETAIL endpoint which includes embedded assets
        console.log('Fetching profile detail for:', profileId);
        const profileDetailRes = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/${profileId}/`, {
          credentials: 'include',
        });
        if (!profileDetailRes.ok) {
          console.log('Brand profile detail fetch failed:', profileDetailRes.status);
          return;
        }
        const profileDetailJson = await profileDetailRes.json().catch(() => null);
        console.log('Brand profile detail response:', profileDetailJson);

        const profile = profileDetailJson?.data || profileDetailJson;
        const assetList = profile?.assets || [];

        // Find logo asset
        const logoAsset = assetList.find((a: any) =>
          a.asset_type === 'logo' ||
          String(a.asset_type || '').includes('logo')
        );

        console.log('Found logo asset:', logoAsset);

        if (logoAsset?.url && !cancelled) {
          // Convert relative path to full S3 URL
          const url = logoAsset.url;
          let finalUrl = url;
          if (url.startsWith('http')) {
            setBrandLogoUrl(url);
          } else {
            // Construct S3 URL
            finalUrl = `https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/${url}`;
            setBrandLogoUrl(finalUrl);
          }
          console.log('Brand logo loaded:', finalUrl);
        } else {
          console.log('No logo asset found in assets:', assetList);
        }
      } catch (e) {
        console.error('Failed to load brand logo:', e);
      }
    };

    void loadBrandLogo();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, club]);

  const orgKeyForRoutes = useMemo(() => {
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    return slug || String(orgSlugOrId || '').trim();
  }, [org?.slug, orgSlugOrId, resolvedOrgSlug]);
  const clubKeyForRoutes = useMemo(() => String(club?.slug || clubSlugOrId || '').trim(), [club?.slug, clubSlugOrId]);


  const extractCount = (raw: any): number => {
    const envelope = raw?.data ?? raw;
    const countRaw = envelope?.count ?? raw?.count;
    if (typeof countRaw === 'number') return countRaw;
    const list = extractList(envelope);
    return Array.isArray(list) ? list.length : 0;
  };

  const mergeUniqueById = <T extends { id: any }>(items: T[]): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items || []) {
      const key = String((item as any)?.id ?? '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  };

  useEffect(() => {
    let cancelled = false;

    const loadOrgClubs = async () => {
      const orgSlug = String(orgSlugForDirectoryLists || effectiveOrgSlug || '').trim();
      if (!orgSlug) return;
      setOrgClubsForSwitcherLoading(true);

      try {
        const params = new URLSearchParams();
        params.set('page_size', '500');
        params.set('include_archived', 'true');
        params.set('parent_project__isnull', 'true');
        const res = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?${params.toString()}`,
          { credentials: 'include' },
        );
        if (!res.ok) throw new Error(`Failed to load clubs (${res.status})`);
        const json = await res.json().catch(() => null);
        const raw = unwrapEnvelope<any>(json);
        const list: any[] = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
        const normalized = mergeUniqueById(
          (list || [])
            .map((p: any) => ({
              id: String(p?.id || '').trim(),
              name: String(p?.name || 'Club'),
              slug: p?.slug ? String(p.slug) : undefined,
            }))
            .filter((p: any) => Boolean(p.id)),
        );
        if (cancelled) return;
        setOrgClubsForSwitcher(normalized);
      } catch {
        if (cancelled) return;
        setOrgClubsForSwitcher([]);
      } finally {
        if (!cancelled) setOrgClubsForSwitcherLoading(false);
      }
    };

    void loadOrgClubs();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, effectiveOrgSlug, orgSlugForDirectoryLists]);

  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      if (activeTabFromUrl !== 'hierarchy') return;
      if (!orgSlugForDirectoryLists || !clubIdForDirectoryLists) return;

      setHierarchyLoading(true);
      setHierarchyError(null);

      try {
        // 1) Fetch all teams for this federation and filter to this club.
        // We do this (instead of relying on `parent_project=...`) because the API response shape
        // differs between endpoints and older servers may ignore unknown query params.
        const teamsRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForDirectoryLists)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
          { credentials: 'include' },
        );

        if (!teamsRes.ok) throw new Error(`Failed to load teams (${teamsRes.status})`);
        const teamsJson = await teamsRes.json().catch(() => null);
        const teamsRaw = unwrapEnvelope<any>(teamsJson);
        const teamsList: any[] = Array.isArray(teamsRaw?.results) ? teamsRaw.results : Array.isArray(teamsRaw) ? teamsRaw : [];

        const filteredTeams = teamsList
          .filter((t: any) => {
            const parent =
              (t as any)?.parent_id ??
              (t as any)?.parent_project_id ??
              (typeof (t as any)?.parent_project === 'object' ? (t as any)?.parent_project?.id : (t as any)?.parent_project) ??
              (typeof (t as any)?.parent === 'object' ? (t as any)?.parent?.id : (t as any)?.parent);
            if (parent == null) return false;
            return String(typeof parent === 'object' ? parent.id : parent) === String(clubIdForDirectoryLists);
          })
          .map((t: any) => ({
            id: String(t?.id || '').trim(),
            name: String(t?.name || 'Team'),
            slug: t?.slug ? String(t.slug) : undefined,
            organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined,
            organisation: t?.organisation,
          }))
          .filter((t: any) => Boolean(t.id));

        if (cancelled) return;
        setHierarchyTeams(filteredTeams);

        // 2) Fetch seasons for those teams (batched)
        const teamIds = filteredTeams.map((t: any) => String(t.id)).filter(Boolean);
        if (!teamIds.length) {
          setHierarchySeasonsByTeamId({});
          return;
        }

        const chunkSize = 50;
        const chunks: string[][] = [];
        for (let i = 0; i < teamIds.length; i += chunkSize) chunks.push(teamIds.slice(i, i + chunkSize));

        const seasonsChunks = await Promise.all(
          chunks.map(async (chunk) => {
            const params = new URLSearchParams();
            params.set('project_id__in', chunk.join(','));
            params.set('page_size', '500');

            // First try: strict typed seasons.
            const typed = new URLSearchParams(params);
            typed.set('type', 'season');
            const typedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${typed.toString()}`, { credentials: 'include' });
            if (!typedRes.ok) throw new Error(`Failed to load seasons (${typedRes.status})`);
            const typedJson = await typedRes.json().catch(() => null);
            const typedRaw = unwrapEnvelope<any>(typedJson);
            const typedList: any[] = extractList(typedRaw);
            if (typedList.length > 0) return typedList;

            // Fallback: some data stores season type in metadata/data or naming, not in `type`.
            const untypedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
            if (!untypedRes.ok) throw new Error(`Failed to load seasons (${untypedRes.status})`);
            const untypedJson = await untypedRes.json().catch(() => null);
            const untypedRaw = unwrapEnvelope<any>(untypedJson);
            const untypedList: any[] = extractList(untypedRaw);
            return untypedList.filter(isSeasonPeriod);
          }),
        );

        const mergedSeasons = mergeUniqueById(seasonsChunks.flat() as any[]);

        const byTeam: Record<string, Period[]> = {};
        for (const season of mergedSeasons) {
          const pid = season?.project_id ?? season?.project?.id ?? '';
          const teamId = pid != null ? String(pid) : '';
          if (!teamId) continue;
          (byTeam[teamId] ||= []).push(season);
        }

        // Stable sort by name (best-effort)
        for (const key of Object.keys(byTeam)) {
          byTeam[key] = [...byTeam[key]].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        }

        if (cancelled) return;
        setHierarchySeasonsByTeamId(byTeam);

        // 3) Fetch all periods for those teams to compute competitions + matches counts.
        try {
          const periodsChunks = await Promise.all(
            chunks.map(async (chunk) => {
              const params = new URLSearchParams();
              params.set('project_id__in', chunk.join(','));
              params.set('page_size', '250');
              const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
              return await fetchAllPages<any>(url, { credentials: 'include' }, { bypass: true, maxItems: 5000 });
            }),
          );

          const allPeriods: any[] = periodsChunks.flat();

          const childrenMap = new Map<string, any[]>();
          for (const p of allPeriods || []) {
            const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
            if (!parentId) continue;
            const key = String(parentId);
            const arr = childrenMap.get(key) || [];
            arr.push(p);
            childrenMap.set(key, arr);
          }

          const getRecursiveActivitiesCount = (p: any): number => {
            let count = (p?.activities_count ?? 0);
            const children = childrenMap.get(String(p?.id));
            if (children) {
              for (const child of children) {
                count += getRecursiveActivitiesCount(child);
              }
            }
            return count;
          };

          const competitionsCountByTeamId: Record<string, number> = {};
          const matchesCountByTeamId: Record<string, number> = {};

          const competitionsCountBySeasonId: Record<string, number> = {};
          const matchesCountBySeasonId: Record<string, number> = {};

          for (const p of allPeriods || []) {
            if (!isCompetitionPeriod(p)) continue;
            const teamIdRaw = p?.project_id ?? p?.project?.id ?? null;
            const teamId = teamIdRaw != null ? String(teamIdRaw) : '';
            if (!teamId) continue;

            competitionsCountByTeamId[teamId] = (competitionsCountByTeamId[teamId] || 0) + 1;
            matchesCountByTeamId[teamId] = (matchesCountByTeamId[teamId] || 0) + getRecursiveActivitiesCount(p);
          }

          // Per-season counts: competitions + matches under each season
          for (const season of mergedSeasons || []) {
            const seasonId = String((season as any)?.id ?? '').trim();
            if (!seasonId) continue;
            const children = childrenMap.get(seasonId) || [];
            const competitions = (children || []).filter((c) => isCompetitionPeriod(c));
            competitionsCountBySeasonId[seasonId] = competitions.length;
            matchesCountBySeasonId[seasonId] = competitions.reduce((sum, c) => sum + getRecursiveActivitiesCount(c), 0);
          }

          if (!cancelled) {
            setHierarchyCompetitionsCountByTeamId(competitionsCountByTeamId);
            setHierarchyMatchesCountByTeamId(matchesCountByTeamId);
            setHierarchyCompetitionsCountBySeasonId(competitionsCountBySeasonId);
            setHierarchyMatchesCountBySeasonId(matchesCountBySeasonId);
          }
        } catch {
          if (!cancelled) {
            setHierarchyCompetitionsCountByTeamId({});
            setHierarchyMatchesCountByTeamId({});
            setHierarchyCompetitionsCountBySeasonId({});
            setHierarchyMatchesCountBySeasonId({});
          }
        }

        // 4) Fetch member counts per team (best-effort)
        try {
          const membersCountByTeamId: Record<string, number> = {};
          const concurrency = 8;
          for (let i = 0; i < filteredTeams.length; i += concurrency) {
            const batch = filteredTeams.slice(i, i + concurrency);
            const results = await Promise.all(
              batch.map(async (t) => {
                const tid = String(t?.id || '').trim();
                if (!tid) return null;
                const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(tid)}/members/?page_size=1`;
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) return { teamId: tid, count: 0 };
                const json = await res.json().catch(() => null);
                return { teamId: tid, count: extractCount(json) };
              }),
            );

            for (const r of results) {
              if (!r) continue;
              membersCountByTeamId[r.teamId] = r.count;
            }
          }

          if (!cancelled) setHierarchyMembersCountByTeamId(membersCountByTeamId);
        } catch {
          if (!cancelled) setHierarchyMembersCountByTeamId({});
        }
      } catch (e) {
        if (cancelled) return;
        setHierarchyError(e instanceof Error ? e.message : 'Failed to load hierarchy');
        setHierarchyTeams([]);
        setHierarchySeasonsByTeamId({});
        setHierarchyCompetitionsCountByTeamId({});
        setHierarchyMatchesCountByTeamId({});
        setHierarchyCompetitionsCountBySeasonId({});
        setHierarchyMatchesCountBySeasonId({});
        setHierarchyMembersCountByTeamId({});
      } finally {
        if (!cancelled) setHierarchyLoading(false);
      }
    };

    void loadHierarchy();
    return () => {
      cancelled = true;
    };
  }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists, orgSlugForDirectoryLists]);

  // If we arrived via org UUID, replace with org slug for stable routing.
  const shouldResolveOrg = useMemo(() => looksLikeIdentifier(orgSlugOrId), [orgSlugOrId]);

  useEffect(() => {
    if (!shouldResolveOrg) return;
    const slug = String(org?.slug || resolvedOrgSlug || '').trim();
    if (!slug) return;
    if (slug === orgSlugOrId) return;

    const clubKey = String(club?.slug || clubSlugOrId || '').trim();
    if (!clubKey) return;

    navigate(`/${encodeURIComponent(slug)}/${encodeURIComponent(clubKey)}${location.search || ''}`, { replace: true });
  }, [club, clubSlugOrId, location.search, navigate, org?.slug, orgSlugOrId, resolvedOrgSlug, shouldResolveOrg]);

  const backToOrgHref = useMemo(() => {
    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey) return '/federations';

    // Mirror federation layout: go back to org page, clubs tab.
    const params = new URLSearchParams(location.search || '');
    params.set('tab', 'clubs');
    return `/${encodeURIComponent(orgKey)}?${params.toString()}`;
  }, [location.search, org?.slug, orgSlugOrId]);

  const clubBreadcrumbOptions: BreadcrumbSwitcherOption[] = useMemo(() => {
    const base = (orgClubsForSwitcher || []).map((c: any) => ({
      id: String(c.id),
      label: String(c.name || c.slug || c.id),
      slug: String(c.slug || c.id),
    }));

    if (club && !base.some((c) => String(c.id) === String(club.id))) {
      base.push({
        id: String(club.id),
        label: String(club.name || club.slug || club.id),
        slug: String(club.slug || club.id),
      });
    }
    return base;
  }, [club, orgClubsForSwitcher]);

  const handleClubSwitch = (option: BreadcrumbSwitcherOption) => {
    const orgKey = String(org?.slug || orgSlugOrId || '').trim();
    if (!orgKey) return;
    navigate(`/${encodeURIComponent(orgKey)}/${encodeURIComponent(String(option.slug || option.id))}${location.search || ''}`);
  };

  const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);

  useEffect(() => {
    if (!org || !club) return;
    if (!shouldResolveClub) return;
    const slug = String(club?.slug || '').trim();
    if (!slug) return;
    if (slug === clubSlugOrId) return;

    navigate(
      `/${encodeURIComponent(String(org?.slug || orgSlugOrId))}/${encodeURIComponent(slug)}${location.search || ''}`,
      { replace: true },
    );
  }, [club, clubSlugOrId, location.search, navigate, org, orgSlugOrId, shouldResolveClub]);

  if (loading) {
    return (
      <div className="p-6 club-detail-page">
        <div>
          <PageHeader title="Club" />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">Loading club details...</div>
            </Card>
          </PageContent>
        </div>
      </div>
    );
  }

  if (error || !org || !club) {
    return (
      <div className="p-6 club-detail-page">
        <div>
          <PageHeader title="Club" />
          <PageContent>
            <Alert variant="error">{error || 'Club not found'}</Alert>
            <Button variant="secondary" onClick={() => navigate(backToOrgHref)}>
              Back
            </Button>
          </PageContent>
        </div>
      </div>
    );
  }

  // If we're still on a numeric/UUID route, the redirect useEffect will replace the URL.

  const clubDefaultLocation = String((club as any)?.metadata?.identity?.default_location || '').trim();

  return (
    <>
      <div className="club-detail-page">
        <PageHeader
          title={club.name}
          subtitle={clubDefaultLocation ? `Club overview • Location: ${clubDefaultLocation}` : 'Club overview • Location: —'}
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: org?.name || 'Federation', onClick: () => navigate(backToOrgHref) },
            {
              label: (
                <BreadcrumbContextSwitcher
                  currentId={String(club.id)}
                  options={clubBreadcrumbOptions}
                  onSelect={handleClubSwitch}
                  hasDropdown={!orgClubsForSwitcherLoading && clubBreadcrumbOptions.length > 1}
                  type="project"
                />
              ),
              current: true,
            },
          ]}
          actions={
            <div className="flex-row flex-wrap gap-8">
              {(() => {
                const isActive = club && activeContext?.club && (
                  String(activeContext.club.id) === String(club.id) ||
                  activeContext.club.slug === club.slug
                );
                return (
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={async () => {
                      if (!club || isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('club', String(club.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                        console.log('[ClubOrganisationDetailPage] Active context updated:', context);
                      } catch (error) {
                        console.error('Failed to set active context:', error);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || isActive}
                    style={{
                      backgroundColor: isActive ? '#dcfce7' : undefined,
                      color: isActive ? '#166534' : undefined,
                      border: isActive ? '1px solid #10b981' : undefined,
                      fontWeight: isActive ? 600 : undefined,
                      opacity: activatingContext || isActive ? 0.8 : 1,
                    }}
                  >
                    {isActive ? '✓ Active Context' : 'Make active'}
                  </Button>
                );
              })()}
              <Button variant="secondary" size="sm" onClick={() => navigate(backToOrgHref)}>
                Back
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsProjectDetailModalOpen(true)}>
                View
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsProjectEditModalOpen(true)}>
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (!club) return;
                  if (!window.confirm(`Are you sure you want to delete club ${club.name}?`)) return;
                  try {
                    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(club.id))}/`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken(),
                      },
                      credentials: 'include',
                    });
                    if (!res.ok) throw new Error('Failed to delete club');
                    navigate(backToOrgHref);
                  } catch (e) {
                    console.error('Delete failed:', e);
                    alert('Failed to delete club');
                  }
                }}
                style={{ color: '#dc2626' }}
              >
                Delete
              </Button>
            </div>
          }
        />

        {/* Mobile Tab Bar (hidden on desktop) */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'teams', label: 'Teams' },
            { id: 'seasons', label: 'Seasons' },
            { id: 'competitions', label: 'Competitions' },
            { id: 'matches', label: 'Matches' },
            { id: 'members', label: 'Members' },
            { id: 'media', label: 'Media' },
            { id: 'assets', label: 'Assets' },
            { id: 'balance', label: 'Balance' },
            { id: 'transactions', label: 'Transactions' },
            { id: 'identity', label: 'Identity' },
            { id: 'kits', label: 'Kits' },
            { id: 'settings', label: 'Settings' },
          ]}
          activeTab={activeTabFromUrl}
        />

        <PageContent>
          {activeTabFromUrl === 'overview' && (
            <ClubOverviewTab
              club={club}
              org={org}
              overviewError={overviewError}
              overviewLoading={overviewLoading}
              overviewTeams={overviewTeams}
              overviewSeasons={overviewSeasons}
              overviewMembers={overviewMembers}
              overviewCounts={overviewCounts}
              orgKeyForRoutes={orgKeyForRoutes}
              clubKeyForRoutes={clubKeyForRoutes}
              navigate={navigate}
              makeTabHref={makeTabHref}
            />
          )}

          {activeTabFromUrl === 'hierarchy' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <ClubHierarchyTab
              club={club}
              orgKeyForRoutes={orgKeyForRoutes}
              clubKeyForRoutes={clubKeyForRoutes}
              hierarchySearch={hierarchySearch}
              setHierarchySearch={setHierarchySearch}
              hierarchyTeams={hierarchyTeams}
              hierarchySeasonsByTeamId={hierarchySeasonsByTeamId}
              hierarchyCompetitionsCountByTeamId={hierarchyCompetitionsCountByTeamId}
              hierarchyMatchesCountByTeamId={hierarchyMatchesCountByTeamId}
              hierarchyCompetitionsCountBySeasonId={hierarchyCompetitionsCountBySeasonId}
              hierarchyMatchesCountBySeasonId={hierarchyMatchesCountBySeasonId}
              hierarchyMembersCountByTeamId={hierarchyMembersCountByTeamId}
              hierarchyMembersCountForClub={hierarchyMembersCountForClub}
              hierarchyLoading={hierarchyLoading}
              hierarchyError={hierarchyError}
              navigate={navigate}
            />
          )}

          {activeTabFromUrl === 'teams' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <TeamsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'seasons' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <SeasonsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} preselectedClubSlug={clubKeyForRoutes} />
          )}

          {activeTabFromUrl === 'competitions' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <CompetitionsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} preselectedClubSlug={clubKeyForRoutes} />
          )}

          {activeTabFromUrl === 'matches' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <MatchesList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} preselectedClubSlug={clubKeyForRoutes} />
          )}

          {activeTabFromUrl === 'members' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <UsersList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'media' && club && orgIdForDirectoryLists && (
            <div className="space-y-6">
              <AssetCompletionMatrix
                projectId={club.slug || String(club.id)}
                entityName={club.name}
                title="Asset Completion Matrix"
              />
            </div>
          )}

          {activeTabFromUrl === 'assets' && club && orgIdForDirectoryLists && (
            <div className="space-y-6">
              {/* Brand Assets: Logo, Sponsor, Kits, Location */}
              <AssetsTab
                level="club"
                organisationId={String(orgIdForDirectoryLists)}
                projectId={club.slug || String(club.id)}
                entityName={club.name}
              />

              {/* Generic File Assets */}
              <ClubAssetsTab
                clubId={String(club.id)}
                clubName={club.name}
                clubMetadata={(club as any)?.metadata || {}}
                onAssetsUpdated={() => {
                  window.location.reload();
                }}
              />
            </div>
          )}

          {activeTabFromUrl === 'balance' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <TeamCreditsTab view="balance" projectId={clubIdForDirectoryLists} projectName={club.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'transactions' && orgIdForDirectoryLists && clubIdForDirectoryLists && (
            <TeamCreditsTab view="transactions" projectId={clubIdForDirectoryLists} projectName={club.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'identity' && club && orgIdForDirectoryLists && (
            <BrandIdentityPage
              projectId={club.slug || String(club.id)}
              projectName={club.name}
            />
          )}

          {activeTabFromUrl === 'kits' && club && orgIdForDirectoryLists && (
            <ClubKitsTab
              club={club}
              apiBaseUrl={apiBaseUrl}
              brandProfileId={brandProfileId}
              orgId={String(orgIdForDirectoryLists)}
            />
          )}

          {activeTabFromUrl === 'settings' && club && orgIdForDirectoryLists && (
            <ContentAvailabilityCard
              scopeType="PROJECT"
              organisationId={String(orgIdForDirectoryLists)}
              projectId={String(club.id)}
              scopeName={club.name}
            />
          )}
        </PageContent>
      </div>

      <ProjectDetailModal
        opened={isProjectDetailModalOpen}
        onClose={() => setIsProjectDetailModalOpen(false)}
        project={club}
      />

      <EntityEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSaved={() => window.location.reload()}
        entityType="club"
        entityId={club?.slug || club?.id || ''}
        entityName={club?.name}
        organisationId={String(org?.id || '')}
        projectId={club?.slug || club?.id}
        initialEntityData={club ? {
          id: String(club.id),
          name: club.name || '',
          slug: club.slug,
          description: (club as any).description,
          is_active: (club as any).is_active ?? true,
          metadata: (club as any).metadata || {},
        } : undefined}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </>
  );
}
