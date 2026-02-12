/**
 * Media Library Page — Unified Asset Browser
 *
 * Shows all brand assets and file uploads for the active organisation,
 * organized by hierarchy level (Organisation, Club, Team, Member) with
 * content-type sub-filters per level.
 *
 * Panel B tabs: Organisation, Club, Team, Member, Files
 * Each level has specific sub-tabs:
 * - Organisation: Logo, Watermark, Favicon, Font
 * - Club: Logo, Tenue, Sponsor
 * - Team: Logo, Tenue, Sponsor
 * - Member: Profile, Close-up, In Tenue, Intro, Celebration
 *
 * Data sources:
 * - Brand Assets via /api/v1/branding/profiles → assets
 * - File Assets via /api/v1/files/
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Stack, Text, Alert, Badge, Button } from '@django-core/design-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../../utils/apiBase';
import { fetchAllPages } from '../../utils/fetchAllPages';
import {
  getContentType,
  getHierarchyLevel,
  CONTENT_TYPE_LABELS,
  type ContentType,
  type HierarchyLevel,
  type BrandAsset,
} from '../../hooks/useBrandAssets';
import {
  useFileAssets,
  getFileIcon,
  formatFileSize,
  getFileTypeFilter,
  type FileAsset,
  type FileTypeFilter,
} from '../../hooks/useFileAssets';

// ============================================================================
// Types
// ============================================================================

type HierarchyTab = 'organisation' | 'club' | 'team' | 'member' | 'files';

interface OrganisationOption {
  id: string;
  name: string;
  slug: string;
}

interface ProjectOption {
  id: string;
  name: string;
  slug: string;
  organisation?: string | { id: string };
  parent_id?: number | null;  // API returns parent_id (integer), not parent_project
  parent_name?: string | null;
}

// Kit type filters (for tenue assets at club/team level and member level)
const KIT_TYPES = [
  { key: 'all', label: 'Alle Tenues' },
  { key: 'home', label: 'Thuis' },
  { key: 'away', label: 'Uit' },
  { key: 'third', label: 'Derde' },
  { key: 'goalkeeper', label: 'Keeper' },
  { key: 'coach', label: 'Coach' },
  { key: 'training', label: 'Training' },
];

// Sub-tab definitions per hierarchy level
const SUB_TABS: Record<HierarchyTab, { key: string; label: string }[]> = {
  organisation: [
    { key: 'all', label: 'Alles' },
    { key: 'logo', label: 'Logo' },
    { key: 'watermark', label: 'Watermark' },
    { key: 'favicon', label: 'Favicon' },
    { key: 'font', label: 'Font' },
    { key: 'location', label: 'Locatie' },
  ],
  club: [
    { key: 'all', label: 'Alles' },
    { key: 'logo', label: 'Logo' },
    { key: 'kit', label: 'Tenue' },
    { key: 'sponsor', label: 'Sponsor' },
    { key: 'location', label: 'Locatie' },
  ],
  team: [
    { key: 'all', label: 'Alles' },
    { key: 'logo', label: 'Logo' },
    { key: 'kit', label: 'Tenue' },
    { key: 'sponsor', label: 'Sponsor' },
  ],
  member: [
    { key: 'all', label: 'Alles' },
    { key: 'member_profile', label: 'Foto' },
    { key: 'member_fullbody', label: 'Full Body' },
    { key: 'member_closeup', label: 'Close-up' },
    { key: 'member_intro', label: 'Intro' },
    { key: 'member_celebration', label: 'Celebration' },
  ],
  files: [
    { key: 'all', label: 'Alles' },
    { key: 'image', label: 'Afbeeldingen' },
    { key: 'video', label: "Video's" },
    { key: 'document', label: 'Documenten' },
    { key: 'font', label: 'Fonts' },
  ],
};

// ============================================================================
// Helpers
// ============================================================================

/** Human-friendly label for asset_type (replacing code-style names) */
function friendlyAssetLabel(asset: BrandAsset): string {
  const t = asset.asset_type;
  // Member assets
  if (t.startsWith('member_closeup')) return 'Close-up';
  if (t.includes('in_tenue')) return 'In Tenue';
  if (t.includes('lineup')) return 'Lineup';
  if (t.includes('member_intro')) return 'Short Intro';
  if (t.includes('member_goal_celebration') || t.includes('celebration')) return 'Celebration';
  if (t.includes('profile') || t === 'headshot') return 'Profiel Foto';
  // Kit assets
  if (t.includes('kit_home')) return t.includes('combined') ? 'Thuistenue (Compleet)' : t.includes('upload') ? 'Thuistenue (Upload)' : 'Thuistenue';
  if (t.includes('kit_away')) return t.includes('combined') ? 'Uittenue (Compleet)' : t.includes('upload') ? 'Uittenue (Upload)' : 'Uittenue';
  if (t.includes('kit_third')) return t.includes('combined') ? 'Derde Tenue (Compleet)' : t.includes('upload') ? 'Derde Tenue (Upload)' : 'Derde Tenue';
  if (t.includes('kit_goalkeeper')) return t.includes('combined') ? 'Keeper Tenue (Compleet)' : t.includes('upload') ? 'Keeper Tenue (Upload)' : 'Keeper Tenue';
  if (t.includes('kit_coach')) return t.includes('combined') ? 'Coach Tenue (Compleet)' : t.includes('upload') ? 'Coach Tenue (Upload)' : 'Coach Tenue';
  if (t.includes('kit_assistant')) return t.includes('combined') ? 'Assistent Tenue (Compleet)' : t.includes('upload') ? 'Assistent Tenue (Upload)' : 'Assistent Tenue';
  if (t.includes('kit_training')) return t.includes('combined') ? 'Training Tenue (Compleet)' : t.includes('upload') ? 'Training Tenue (Upload)' : 'Training Tenue';
  // Logos
  if (t === 'logo_upload') return 'Logo (Upload)';
  if (t === 'logo_light') return 'Logo (Licht)';
  if (t === 'logo_dark') return 'Logo (Donker)';
  if (t === 'watermark') return 'Watermerk';
  if (t === 'favicon') return 'Favicon';
  // Sponsors
  if (t === 'sponsor_logo_upload') return 'Sponsor Logo (Upload)';
  if (t === 'sponsor_logo') return 'Sponsor Logo';
  // Other
  if (t === 'location_photo') return 'Locatie Foto';
  if (t === 'font_file') return 'Font';
  return asset.asset_type_label || t;
}

/** Get member sub-content type for filtering */
function getMemberContentType(assetType: string): string {
  if (assetType.includes('closeup')) return 'closeup';
  if (assetType.includes('in_tenue') && !assetType.includes('intro') && !assetType.includes('celebration')) return 'in_tenue';
  if (assetType.includes('intro')) return 'intro';
  if (assetType.includes('celebration') || assetType.includes('goal_celebration')) return 'celebration';
  if (assetType.includes('profile') || assetType === 'headshot') return 'profile';
  return 'other';
}

/** Badge color per hierarchy level */
function levelColor(level: HierarchyLevel): string {
  switch (level) {
    case 'club': return '#2563eb';
    case 'team': return '#7c3aed';
    case 'member': return '#059669';
    default: return '#6b7280';
  }
}

/** Badge label per hierarchy level */
function levelLabel(level: HierarchyLevel): string {
  switch (level) {
    case 'club': return 'Club';
    case 'team': return 'Team';
    case 'member': return 'Speler';
    default: return 'Organisatie';
  }
}

// ============================================================================
// Asset Card
// ============================================================================

function AssetCard({ asset }: { asset: BrandAsset }) {
  const level = getHierarchyLevel(asset);
  const contentType = getContentType(asset.asset_type);
  const isVideo = asset.file_details?.content_type?.startsWith('video/');

  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Thumbnail */}
      <div style={{
        height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--app-bg)', borderBottom: '1px solid var(--app-border)',
        overflow: 'hidden', position: 'relative',
      }}>
        {asset.url ? (
          isVideo ? (
            <video
              src={asset.url}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={asset.url}
              alt={asset.alt_text || friendlyAssetLabel(asset)}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 8 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <span style={{ fontSize: 40, opacity: 0.3 }}>
            {contentType === 'kit' ? '👕' : contentType === 'logo' ? '🏷️' : contentType === 'closeup' ? '📸' : '📁'}
          </span>
        )}
        {/* Level badge overlay */}
        <span style={{
          position: 'absolute', top: 8, left: 8,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          backgroundColor: levelColor(level), color: '#fff',
        }}>
          {levelLabel(level)}
        </span>
        {isVideo && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            backgroundColor: '#dc2626', color: '#fff',
          }}>
            🎬 Video
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {/* Title: friendly name */}
        <Text weight="bold" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {friendlyAssetLabel(asset)}
        </Text>

        {/* Profile / Entity name */}
        <Text size="xs" color="secondary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {asset.project_name || asset.profile_name || asset.organisation_name || '—'}
        </Text>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Badge size="sm" variant="default">{CONTENT_TYPE_LABELS[contentType] || contentType}</Badge>
          {asset.file_details?.content_type && (
            <Badge size="sm" variant="default" style={{ opacity: 0.7 }}>
              {asset.file_details.content_type.split('/')[1]?.toUpperCase() || asset.file_details.content_type}
            </Badge>
          )}
        </div>

        {/* File details */}
        {asset.file_details && (
          <Text size="xs" color="secondary" style={{ marginTop: 2 }}>
            {asset.file_details.name?.length > 30 ? asset.file_details.name.slice(0, 27) + '...' : asset.file_details.name}
            {asset.file_details.size > 0 && <> &middot; {formatFileSize(asset.file_details.size)}</>}
          </Text>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// File Card
// ============================================================================

function FileCard({ file, onDownload }: { file: FileAsset; onDownload: (id: string) => void }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--app-bg)', borderBottom: '1px solid var(--app-border)',
      }}>
        <span style={{ fontSize: 40 }}>{getFileIcon(file.mime_type)}</span>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <Text weight="bold" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {file.original_name || 'Naamloos bestand'}
        </Text>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Badge size="sm" variant="default">{file.mime_type.split('/')[1]?.toUpperCase() || file.mime_type}</Badge>
          {file.is_public && <Badge size="sm" variant="primary">Publiek</Badge>}
        </div>
        <Text size="xs" color="secondary">
          {formatFileSize(file.file_size)}
          {file.uploaded_by_name && <> &middot; {file.uploaded_by_name}</>}
        </Text>
        <button
          onClick={() => onDownload(file.id)}
          style={{
            marginTop: 4, alignSelf: 'flex-start', fontSize: 11, padding: '4px 10px',
            borderRadius: 6, border: '1px solid var(--app-border)', backgroundColor: 'transparent',
            cursor: 'pointer', color: 'var(--app-text)',
          }}
        >
          ⬇ Download
        </button>
      </div>
    </Card>
  );
}

// ============================================================================
// Member Media Card
// ============================================================================

function MemberMediaCard({ item }: { item: {
  id: string;
  name: string;
  url: string;
  asset_type: string;
  member_id: string;
  member_name: string;
  project_id: string;
  project_name: string;
  parent_project_id: string | null;
  kit_type?: string;
  created_at?: string;
} }) {
  const isVideo = item.asset_type.includes('intro') || item.asset_type.includes('celebration');

  // Map asset types to friendly labels
  const assetTypeLabels: Record<string, string> = {
    member_profile: 'Profile',
    member_fullbody: 'Full Body',
    member_closeup: 'Close-up',
    member_intro: 'Intro Video',
    member_celebration: 'Celebration',
  };
  const friendlyType = assetTypeLabels[item.asset_type] || item.asset_type.replace('member_', '').replace(/_/g, ' ');

  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Thumbnail */}
      <div style={{
        height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--app-bg)', borderBottom: '1px solid var(--app-border)',
        overflow: 'hidden', position: 'relative',
      }}>
        {item.url ? (
          isVideo ? (
            <video
              src={item.url}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={item.url}
              alt={item.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 8 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )
        ) : (
          <span style={{ fontSize: 40, opacity: 0.3 }}>👤</span>
        )}
        {/* Member badge */}
        <span style={{
          position: 'absolute', top: 8, left: 8,
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          backgroundColor: '#059669', color: '#fff',
        }}>
          Member
        </span>
        {isVideo && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            backgroundColor: '#dc2626', color: '#fff',
          }}>
            🎬 Video
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <Text weight="bold" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.member_name || item.name || 'Member Media'}
        </Text>
        <Text size="xs" color="secondary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.project_name || '—'}
        </Text>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Badge size="sm" variant="default">{friendlyType}</Badge>
          {item.kit_type && (
            <Badge size="sm" variant="default" style={{ opacity: 0.7 }}>
              {item.kit_type.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

const MediaLibraryPage: React.FC = () => {
  const location = useLocation();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const { user } = useAuth();
  const orgId = (context as any)?.organisation?.id as string | undefined;
  const orgSlug = (context as any)?.organisation?.slug as string | undefined;

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  // Read level from URL (set by Panel B sidebar)
  const rawTab = new URLSearchParams(location.search).get('tab') || 'organisation';
  const activeLevel = (['organisation', 'club', 'team', 'member', 'files'].includes(rawTab) ? rawTab : 'organisation') as HierarchyTab;

  // Brand assets state (replacing useBrandAssets hook - need to fetch from org AND all projects)
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  // Member media items state (closeups, fullbody, intro videos, etc.)
  // These come from membership.metadata.teamreel_assets
  interface MemberMediaItem {
    id: string;
    name: string;
    url: string;
    asset_type: string;  // member_profile, member_fullbody, member_closeup, member_intro_video, etc.
    member_id: string;
    member_name: string;
    project_id: string;
    project_name: string;
    parent_project_id: string | null;
    kit_type?: string;  // home, away, third, etc.
    created_at?: string;
  }
  const [memberMedia, setMemberMedia] = useState<MemberMediaItem[]>([]);
  const [memberMediaLoading, setMemberMediaLoading] = useState(false);

  // File assets hook
  const { files, loading: filesLoading, error: filesError, fetchFiles, getDownloadUrl } = useFileAssets();

  // Filter state - directory-style dropdowns
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Sub-filter state (content type within level)
  const [subFilter, setSubFilter] = useState<string>('all');
  const [kitFilter, setKitFilter] = useState<string>('all');  // Kit type filter (home, away, etc.)
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset kit filter when sub-filter changes
  useEffect(() => {
    setKitFilter('all');
  }, [subFilter]);

  // Load organisations
  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
      return;
    }

    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000 },
        );
        setOrganisations((orgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
      } catch {
        // ignore
      }
    };
    load();
  }, [isSuperAdmin, myOrganisations]);

  // Load clubs and teams when org changes
  useEffect(() => {
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      const selectedOrg = selectedOrgId
        ? organisations.find((o) => String(o.id) === String(selectedOrgId))
        : null;

      const orgSlugForApi = selectedOrg?.slug || context.organisation?.slug || '';

      if (!orgSlugForApi) {
        setClubs([]);
        setTeams([]);
        return;
      }

      try {
        const [allClubs, allTeams] = await Promise.all([
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&parent_project__isnull=true`,
            { credentials: 'include' },
            { ttlMs: 120_000 },
          ),
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&parent_project__isnull=false`,
            { credentials: 'include' },
            { ttlMs: 120_000 },
          ),
        ]);
        setClubs(allClubs);
        setTeams(allTeams);
      } catch {
        // ignore
      }
    };
    load();
  }, [selectedOrgId, organisations, context.organisation?.slug]);

  // Reset sub-filters when level changes (via Panel B)
  useEffect(() => {
    setSubFilter('all');
    setFileTypeFilter('all');
    setSearchQuery('');
  }, [activeLevel]);

  // Comprehensive asset fetching: ALL brand assets in organisation scope (single API call)
  const fetchAllBrandAssets = useCallback(async () => {
    if (!orgId || !orgSlug) return;

    setBrandLoading(true);
    setBrandError(null);

    try {
      const apiBaseUrl = getApiBaseUrl();

      // Helper to fetch all pages with pagination
      const fetchPaginated = async <T,>(url: string): Promise<T[]> => {
        const all: T[] = [];
        let nextUrl: string | null = url;
        while (nextUrl) {
          const res = await fetch(nextUrl, { credentials: 'include' });
          if (!res.ok) {
            console.warn('[MediaLib] Fetch failed:', url, res.status);
            break;
          }
          const json = await res.json();
          const items: T[] = Array.isArray(json.data?.results) ? json.data.results
            : Array.isArray(json.data) ? json.data
            : Array.isArray(json.results) ? json.results
            : Array.isArray(json) ? json : [];
          all.push(...items);
          nextUrl = json.data?.next || json.meta?.pagination?.next || json.next || null;
        }
        return all;
      };

      // Step 1: Fetch ALL brand profiles (still needed for profile count breakdown)
      // Uses new organisation_scope filter that returns both org-level AND project-level profiles
      const allProfiles = await fetchPaginated<any>(
        `${apiBaseUrl}/api/v1/branding/profiles/?organisation_scope=${orgId}&page_size=500`,
      );

      console.log('[MediaLib] All brand profiles (organisation_scope):', allProfiles.length);

      // Count by type (profile already has project_type from serializer)
      const orgProfiles = allProfiles.filter((p: any) => !p.project);
      const clubProfiles = allProfiles.filter((p: any) => p.project_type === 'club');
      const teamProfiles = allProfiles.filter((p: any) => p.project_type === 'team');

      console.log('[MediaLib] Profiles by type:', {
        org: orgProfiles.length,
        club: clubProfiles.length,
        team: teamProfiles.length,
      });

      // Step 2: Fetch ALL assets in one bulk call (instead of 99+ separate calls)
      // New organisation_scope filter on assets endpoint returns all assets with profile metadata
      let allAssets: BrandAsset[] = [];
      try {
        const bulkUrl = `${apiBaseUrl}/api/v1/branding/assets/?organisation_scope=${orgId}&page_size=500`;
        console.log('[MediaLib] Fetching bulk assets from:', bulkUrl);
        const bulkRes = await fetch(bulkUrl, { credentials: 'include' });
        console.log('[MediaLib] Bulk assets response status:', bulkRes.status);

        if (bulkRes.ok) {
          const bulkJson = await bulkRes.json();
          console.log('[MediaLib] Bulk assets raw response keys:', Object.keys(bulkJson));
          allAssets = Array.isArray(bulkJson.data?.results) ? bulkJson.data.results
            : Array.isArray(bulkJson.data) ? bulkJson.data
            : Array.isArray(bulkJson.results) ? bulkJson.results
            : Array.isArray(bulkJson) ? bulkJson : [];
          console.log('[MediaLib] Bulk assets parsed count:', allAssets.length);
        }
      } catch (bulkErr) {
        console.warn('[MediaLib] Bulk assets fetch failed, using fallback:', bulkErr);
      }

      // Fallback: if bulk endpoint returned 0 assets, fetch per-profile (old method)
      if (allAssets.length === 0 && allProfiles.length > 0) {
        console.log('[MediaLib] Using fallback: fetching assets per profile');
        // Rate-limited: process in batches of 10
        const BATCH_SIZE = 10;
        for (let i = 0; i < allProfiles.length; i += BATCH_SIZE) {
          const batch = allProfiles.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (profile: any) => {
              try {
                const res = await fetch(
                  `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/assets/?page_size=100`,
                  { credentials: 'include' }
                );
                if (!res.ok) return [];
                const json = await res.json();
                const assets: BrandAsset[] = Array.isArray(json.data?.results) ? json.data.results
                  : Array.isArray(json.data) ? json.data
                  : Array.isArray(json.results) ? json.results
                  : Array.isArray(json) ? json : [];
                return assets.map((a: BrandAsset) => ({
                  ...a,
                  profile_name: profile.name,
                  project_id: profile.project ? String(profile.project) : null,
                  project_name: profile.project_name ?? null,
                  project_type: profile.project_type ?? null,
                  parent_project_id: profile.parent_project_id ? String(profile.parent_project_id) : null,
                  organisation_name: profile.organisation_name ?? null,
                }));
              } catch {
                return [];
              }
            })
          );
          allAssets.push(...batchResults.flat());
        }
        console.log('[MediaLib] Fallback fetched:', allAssets.length, 'assets');
      }

      // Log asset breakdown by hierarchy level
      const orgAssets = allAssets.filter((a: any) => a.project_type === null || a.project_type === undefined);
      const clubAssets = allAssets.filter((a: any) => a.project_type === 'club');
      const teamAssets = allAssets.filter((a: any) => a.project_type === 'team');
      console.log('[MediaLib] Brand assets by level:', {
        organisation: orgAssets.length,
        club: clubAssets.length,
        team: teamAssets.length,
        total: allAssets.length,
      });

      setBrandAssets(allAssets);
    } catch (err: any) {
      setBrandError(err.message || 'Failed to load brand assets');
    } finally {
      setBrandLoading(false);
    }
  }, [orgId, orgSlug]);

  // Member media items - fetched from membership.metadata.teamreel_assets
  const fetchMemberMediaItems = useCallback(async () => {
    if (!orgSlug) return;

    setMemberMediaLoading(true);

    try {
      const apiBaseUrl = getApiBaseUrl();

      // Helper to fetch all pages
      const fetchPaginated = async <T,>(url: string): Promise<T[]> => {
        const all: T[] = [];
        let nextUrl: string | null = url;
        while (nextUrl) {
          const res = await fetch(nextUrl, { credentials: 'include' });
          if (!res.ok) break;
          const json = await res.json();
          const items: T[] = Array.isArray(json.data?.results) ? json.data.results
            : Array.isArray(json.data) ? json.data
            : Array.isArray(json.results) ? json.results
            : Array.isArray(json) ? json : [];
          all.push(...items);
          nextUrl = json.data?.next || json.meta?.pagination?.next || json.next || null;
        }
        return all;
      };

      // Fetch all teams (projects with parent_id)
      const allProjects = await fetchPaginated<any>(
        `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000`,
      );
      const teamProjects = allProjects.filter((p: any) => !!p.parent_id);

      console.log('[MediaLib] Fetching member assets from', teamProjects.length, 'teams');

      // Fetch memberships for each team (with metadata containing assets)
      const memberAssets: MemberMediaItem[] = [];

      // Rate-limited batch fetch to avoid overwhelming the backend
      // Process in batches of 5 concurrent requests
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
                { credentials: 'include' }
              );
              if (!res.ok) {
                failedTeamCount++;
                return [];
              }
              const json = await res.json();
              const memberships: any[] = Array.isArray(json.data?.results) ? json.data.results
                : Array.isArray(json.data) ? json.data
                : Array.isArray(json.results) ? json.results
                : Array.isArray(json) ? json : [];
              return memberships.map((m: any) => ({ membership: m, team }));
            } catch {
              failedTeamCount++;
              return [];
            }
          })
        );
        allMembershipData.push(...batchResults.flat());
      }

      console.log('[MediaLib] Total memberships fetched:', allMembershipData.length,
        failedTeamCount > 0 ? `(${failedTeamCount} teams failed)` : '');

      // Debug: log sample membership to see data structure
      if (allMembershipData.length > 0) {
        const sample = allMembershipData[0].membership;
        console.log('[MediaLib] Sample membership:', {
          id: sample.id,
          hasMetadata: !!sample.metadata,
          metadataKeys: sample.metadata ? Object.keys(sample.metadata) : [],
          hasTeamreelAssets: !!sample.metadata?.teamreel_assets,
          teamreelAssetsKeys: sample.metadata?.teamreel_assets ? Object.keys(sample.metadata.teamreel_assets) : [],
        });
      }

      // Extract assets from membership metadata
      for (const { membership, team } of allMembershipData) {
        const tr = membership.metadata?.teamreel_assets || {};
        const memberUser = membership.user || {};
        const memberName = memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email || 'Unknown';

        // Helper to convert storage path to full URL
        const toFullUrl = (urlOrPath: string): string => {
          if (!urlOrPath) return '';
          // Already a full URL
          if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
            return urlOrPath;
          }
          // Storage path - convert to S3 URL (or could use presigned URL endpoint)
          // Using direct S3 URL for now - works if bucket allows public reads or use presigned URLs
          const bucket = 'teamreel-assets-demo';
          const region = 'eu-north-1';
          return `https://${bucket}.s3.${region}.amazonaws.com/${urlOrPath}`;
        };

        // Helper to add asset
        const addAsset = (assetType: string, url: string, kitType?: string) => {
          if (!url) return;
          const fullUrl = toFullUrl(url);
          memberAssets.push({
            id: `${membership.id}-${assetType}${kitType ? `-${kitType}` : ''}`,
            name: `${memberName} - ${assetType}${kitType ? ` (${kitType})` : ''}`,
            url: fullUrl,
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

        // Profile photo
        if (tr?.media?.profile?.url) {
          addAsset('profile', tr.media.profile.url);
        }

        // Fullbody images per kit type
        const fullbodyImages = tr?.images?.fullbody || {};
        for (const [kitType, url] of Object.entries(fullbodyImages)) {
          if (url) addAsset('fullbody', url as string, kitType);
        }
        // Legacy fallback
        if (tr?.media?.kit?.url && !fullbodyImages['home']) {
          addAsset('fullbody', tr.media.kit.url, 'home');
        }

        // Closeup images per kit type
        const closeupImages = tr?.images?.closeup || {};
        for (const [kitType, url] of Object.entries(closeupImages)) {
          if (url) addAsset('closeup', url as string, kitType);
        }
        // Legacy fallback
        if (tr?.media?.closeup?.url && !closeupImages['home']) {
          addAsset('closeup', tr.media.closeup.url, 'home');
        }

        // Intro videos
        const introVideos = tr?.videos?.intro || {};
        for (const [variant, url] of Object.entries(introVideos)) {
          if (url) addAsset('intro_video', url as string, variant);
        }

        // Celebration videos
        const celebrationVideos = tr?.videos?.celebration || {};
        for (const [variant, url] of Object.entries(celebrationVideos)) {
          if (url) addAsset('celebration_video', url as string, variant);
        }
      }

      console.log('[MediaLib] Member assets extracted:', memberAssets.length);
      setMemberMedia(memberAssets);
    } catch (err) {
      console.error('[MediaLib] Failed to fetch member assets:', err);
      setMemberMedia([]);
    } finally {
      setMemberMediaLoading(false);
    }
  }, [orgSlug]);

  // Fetch assets on mount
  useEffect(() => {
    if (orgId) {
      fetchAllBrandAssets();
      fetchMemberMediaItems();
      fetchFiles(orgId);
    }
  }, [orgId, fetchAllBrandAssets, fetchMemberMediaItems, fetchFiles]);

  // Filter teams by selected club
  const filteredTeams = useMemo(() => {
    if (!selectedClubId) return teams;
    return teams.filter((t) => {
      // API returns parent_id as integer
      return String(t.parent_id) === String(selectedClubId);
    });
  }, [teams, selectedClubId]);

  // ── Derived data ──────────────────────────────────────────────────────

  // Filter brand assets by level + sub-filter + hierarchy filters + search
  const filteredBrandAssets = useMemo(() => {
    let result = brandAssets;

    // Debug: log all unique project_type values
    const uniqueTypes = [...new Set(brandAssets.map(a => (a as any).project_type))];
    console.log('[MediaLib] Filtering - unique project_types:', uniqueTypes, 'activeLevel:', activeLevel);

    // Level filter - use project_type directly for accurate filtering
    // Use explicit null/undefined checks for robustness
    if (activeLevel === 'organisation') {
      // Org-level: project_type must be null or undefined (not 'club' or 'team')
      // Also exclude member_* assets (those belong on member tab)
      result = result.filter(a => {
        const pt = (a as any).project_type;
        const isOrgLevel = pt === null || pt === undefined;
        const isMemberAsset = a.asset_type.startsWith('member_');
        return isOrgLevel && !isMemberAsset;
      });
      console.log('[MediaLib] Org filter result:', result.length, 'assets');
    } else if (activeLevel === 'club') {
      // Club-level: project_type is 'club', exclude member_* assets
      result = result.filter(a => (a as any).project_type === 'club' && !a.asset_type.startsWith('member_'));
      console.log('[MediaLib] Club filter result:', result.length, 'assets');
    } else if (activeLevel === 'team') {
      // Team-level: project_type is 'team', exclude member_* assets
      result = result.filter(a => (a as any).project_type === 'team' && !a.asset_type.startsWith('member_'));
      console.log('[MediaLib] Team filter result:', result.length, 'assets');
    } else if (activeLevel === 'member') {
      // Member tab uses memberMedia, not brandAssets - return empty
      result = [];
    }

    // Club filter - ONLY match by project_id for current level
    // For club level: match assets belonging to that club
    // For team level: match teams whose parent is that club
    if (selectedClubId) {
      result = result.filter(a => {
        const assetProjectId = (a as any).project_id;
        const assetParentProjectId = (a as any).parent_project_id;

        if (activeLevel === 'club') {
          // On club tab: only show assets from the selected club itself
          return String(assetProjectId) === String(selectedClubId);
        } else if (activeLevel === 'team') {
          // On team tab: show teams whose parent is the selected club
          return String(assetParentProjectId) === String(selectedClubId);
        }
        // Organisation level: club filter doesn't apply
        return true;
      });
    }

    // Team filter - match by exact project_id
    if (selectedTeamId) {
      result = result.filter(a => {
        const assetProjectId = (a as any).project_id;
        return String(assetProjectId) === String(selectedTeamId);
      });
    }

    // Sub-filter (content type)
    if (subFilter !== 'all') {
      if (activeLevel === 'member') {
        // Member-specific filtering
        result = result.filter(a => getMemberContentType(a.asset_type) === subFilter);
      } else if (activeLevel === 'organisation') {
        // Organisation: logo, watermark, favicon, font, location
        if (subFilter === 'logo') {
          result = result.filter(a => a.asset_type.startsWith('logo'));
        } else if (subFilter === 'watermark') {
          result = result.filter(a => a.asset_type === 'watermark');
        } else if (subFilter === 'favicon') {
          result = result.filter(a => a.asset_type === 'favicon');
        } else if (subFilter === 'font') {
          result = result.filter(a => a.asset_type === 'font_file');
        } else if (subFilter === 'location') {
          result = result.filter(a => a.asset_type === 'location_photo');
        }
      } else {
        // Club/Team: logo, kit, sponsor, location
        result = result.filter(a => {
          const ct = getContentType(a.asset_type);
          return ct === subFilter;
        });
      }
    }

    // Kit type filter (for tenue assets)
    if (kitFilter !== 'all' && subFilter === 'kit') {
      result = result.filter(a => {
        // Match kit_home, kit_away, kit_third, kit_goalkeeper, etc.
        return a.asset_type.includes(`kit_${kitFilter}`);
      });
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        friendlyAssetLabel(a).toLowerCase().includes(q) ||
        a.profile_name?.toLowerCase().includes(q) ||
        a.project_name?.toLowerCase().includes(q) ||
        a.asset_type.toLowerCase().includes(q) ||
        a.file_details?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [brandAssets, activeLevel, subFilter, kitFilter, selectedClubId, selectedTeamId, clubs, teams, searchQuery]);

  // Filtered files
  const filteredFiles = useMemo(() => {
    let result = files;
    if (fileTypeFilter !== 'all') {
      result = result.filter(f => getFileTypeFilter(f.mime_type) === fileTypeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.original_name?.toLowerCase().includes(q) ||
        f.mime_type?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [files, fileTypeFilter, searchQuery]);

  // Filtered member media
  const filteredMemberMedia = useMemo(() => {
    if (activeLevel !== 'member') return [];

    // Start with member assets from membership metadata
    let result = memberMedia;

    console.log('[MediaLib] Member assets from memberships:', result.length);

    // If no member assets found from memberships, fallback to BrandAssets with member_* types
    if (result.length === 0) {
      const memberBrandAssets = brandAssets
        .filter(a => a.asset_type.startsWith('member_'))
        .map(a => ({
          id: a.id,
          name: friendlyAssetLabel(a),
          url: a.url || '',
          asset_type: a.asset_type,
          member_id: '',
          member_name: '',
          project_id: (a as any).project_id || '',
          project_name: (a as any).project_name || '',
          parent_project_id: (a as any).parent_project_id || null,
          kit_type: undefined,
          created_at: a.created_at,
        }));
      result = memberBrandAssets;
      console.log('[MediaLib] Member fallback: using', memberBrandAssets.length, 'BrandAssets with member_* types');
    }

    // Team filter
    if (selectedTeamId) {
      result = result.filter(item => String(item.project_id) === String(selectedTeamId));
    }

    // Club filter - match team's parent
    if (selectedClubId && !selectedTeamId) {
      const teamIds = teams
        .filter(t => String(t.parent_id) === String(selectedClubId))
        .map(t => String(t.id));
      result = result.filter(item => teamIds.includes(String(item.project_id)));
    }

    // Sub-filter (member content type)
    if (subFilter !== 'all') {
      result = result.filter(item => {
        // Map asset_type to content type
        const assetType = item.asset_type || '';
        if (subFilter === 'member_profile' && assetType.includes('profile')) return true;
        if (subFilter === 'member_fullbody' && assetType.includes('fullbody')) return true;
        if (subFilter === 'member_closeup' && assetType.includes('closeup')) return true;
        if (subFilter === 'member_intro' && assetType.includes('intro')) return true;
        if (subFilter === 'member_celebration' && assetType.includes('celebration')) return true;
        return false;
      });
    }

    // Kit type filter (for fullbody/closeup with kit variants)
    if (kitFilter !== 'all' && (subFilter === 'member_fullbody' || subFilter === 'member_closeup')) {
      result = result.filter(item => item.kit_type === kitFilter);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name?.toLowerCase().includes(q) ||
        item.member_name?.toLowerCase().includes(q) ||
        item.project_name?.toLowerCase().includes(q) ||
        item.asset_type?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [memberMedia, brandAssets, activeLevel, subFilter, kitFilter, selectedClubId, selectedTeamId, teams, searchQuery]);

  // Sub-tab counts for current level
  const subTabCounts = useMemo(() => {
    // For member tab, use memberMedia (or fallback to BrandAssets with member_* types)
    if (activeLevel === 'member') {
      // Use same fallback logic as filteredMemberMedia
      let relevantItems: { asset_type: string; project_id: string }[] = memberMedia.map(m => ({
        asset_type: m.asset_type,
        project_id: m.project_id,
      }));
      if (relevantItems.length === 0) {
        relevantItems = brandAssets
          .filter(a => a.asset_type.startsWith('member_'))
          .map(a => ({
            asset_type: a.asset_type,
            project_id: (a as any).project_id || '',
          }));
      }

      // Apply club/team filters to count
      if (selectedTeamId) {
        relevantItems = relevantItems.filter(item => String(item.project_id) === String(selectedTeamId));
      } else if (selectedClubId) {
        const teamIds = teams
          .filter(t => String(t.parent_id) === String(selectedClubId))
          .map(t => String(t.id));
        relevantItems = relevantItems.filter(item => teamIds.includes(String(item.project_id)));
      }

      const counts: Record<string, number> = { all: relevantItems.length };
      relevantItems.forEach(item => {
        const assetType = item.asset_type || '';
        // Map asset_type to sub-filter keys
        if (assetType.includes('profile')) counts.member_profile = (counts.member_profile || 0) + 1;
        else if (assetType.includes('fullbody')) counts.member_fullbody = (counts.member_fullbody || 0) + 1;
        else if (assetType.includes('closeup')) counts.member_closeup = (counts.member_closeup || 0) + 1;
        else if (assetType.includes('intro')) counts.member_intro = (counts.member_intro || 0) + 1;
        else if (assetType.includes('celebration')) counts.member_celebration = (counts.member_celebration || 0) + 1;
      });
      return counts;
    }

    // For other tabs, use brandAssets filtered by level
    const levelAssets = activeLevel === 'files'
      ? []
      : brandAssets.filter(a => {
          if (activeLevel === 'organisation') return (a as any).project_type === null;
          if (activeLevel === 'club') return (a as any).project_type === 'club';
          if (activeLevel === 'team') return (a as any).project_type === 'team';
          return false;
        });

    const counts: Record<string, number> = { all: levelAssets.length };

    if (activeLevel === 'organisation') {
      levelAssets.forEach(a => {
        if (a.asset_type.startsWith('logo')) counts.logo = (counts.logo || 0) + 1;
        else if (a.asset_type === 'watermark') counts.watermark = (counts.watermark || 0) + 1;
        else if (a.asset_type === 'favicon') counts.favicon = (counts.favicon || 0) + 1;
        else if (a.asset_type === 'font_file') counts.font = (counts.font || 0) + 1;
        else if (a.asset_type === 'location_photo') counts.location = (counts.location || 0) + 1;
      });
    } else {
      // Club and Team levels
      levelAssets.forEach(a => {
        const ct = getContentType(a.asset_type);
        counts[ct] = (counts[ct] || 0) + 1;
      });
    }

    return counts;
  }, [brandAssets, memberMedia, activeLevel, selectedClubId, selectedTeamId, teams]);

  // File type counts
  const fileTypeCounts = useMemo(() => ({
    all: files.length,
    image: files.filter(f => getFileTypeFilter(f.mime_type) === 'image').length,
    video: files.filter(f => getFileTypeFilter(f.mime_type) === 'video').length,
    document: files.filter(f => getFileTypeFilter(f.mime_type) === 'document').length,
    font: files.filter(f => getFileTypeFilter(f.mime_type) === 'font').length,
  }), [files]);

  const loading = brandLoading || (activeLevel === 'files' && filesLoading) || (activeLevel === 'member' && memberMediaLoading);
  const error = activeLevel === 'files' ? filesError : brandError;

  const handleDownload = async (fileId: string) => {
    const url = await getDownloadUrl(fileId);
    if (url) window.open(url, '_blank');
  };

  const clearFilters = () => {
    setSelectedOrgId('');
    setSelectedClubId('');
    setSelectedTeamId('');
    setSubFilter('all');
    setKitFilter('all');
    setSearchQuery('');
  };

  // Level labels for header
  const levelLabels: Record<HierarchyTab, string> = {
    organisation: 'Organisatie',
    club: 'Club',
    team: 'Team',
    member: 'Speler',
    files: 'Bestanden',
  };

  if (!orgId) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)', padding: 24 }}>
        <Alert variant="info">Selecteer een organisatie om de media library te bekijken.</Alert>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }}>
      {/* Header */}
      <div style={{ padding: 24, borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <Stack direction="column" gap="1">
          <Text size="xl" weight="bold">Media Library</Text>
          <Text size="md" color="secondary">
            {levelLabels[activeLevel]} assets
          </Text>
        </Stack>
      </div>

      {/* Toolbar: directory-style filters */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--app-border)' }}>
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoeken..."
          style={{
            flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 6,
            border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)',
            fontSize: 13,
          }}
        />

        {/* Organisation filter (only for superadmin) */}
        {isSuperAdmin && organisations.length > 1 && activeLevel !== 'files' && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedClubId('');
              setSelectedTeamId('');
            }}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 160,
            }}
          >
            <option value="">Federation: All</option>
            {[...organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        )}

        {/* Club filter (for club, team, member levels) */}
        {['club', 'team', 'member'].includes(activeLevel) && clubs.length > 0 && (
          <select
            value={selectedClubId}
            onChange={(e) => {
              setSelectedClubId(e.target.value);
              setSelectedTeamId('');
            }}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 160,
            }}
          >
            <option value="">Club: All</option>
            {[...clubs].sort((a, b) => a.name.localeCompare(b.name)).map((club) => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </select>
        )}

        {/* Team filter (for team, member levels) */}
        {['team', 'member'].includes(activeLevel) && filteredTeams.length > 0 && (
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 160,
            }}
          >
            <option value="">Team: All</option>
            {[...filteredTeams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        )}

        {/* Clear button */}
        <Button
          variant="secondary"
          size="md"
          onClick={clearFilters}
          style={{ marginLeft: 'auto' }}
        >
          Clear
        </Button>
      </div>

      {/* Content area */}
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <Stack direction="column" gap="4">

          {/* Sub-tabs (content type chips) */}
          {activeLevel !== 'files' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUB_TABS[activeLevel].map(({ key, label }) => {
                const count = subTabCounts[key] || 0;
                // Always show all sub-tabs so users see the available filters
                return (
                  <FilterChip
                    key={key}
                    active={subFilter === key}
                    onClick={() => setSubFilter(key)}
                    label={label}
                    count={count}
                  />
                );
              })}
            </div>
          )}

          {/* Kit type filter (shown when viewing tenue at club/team level or fullbody/closeup at member level) */}
          {((subFilter === 'kit' && (activeLevel === 'club' || activeLevel === 'team')) ||
            ((subFilter === 'member_fullbody' || subFilter === 'member_closeup') && activeLevel === 'member')) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {KIT_TYPES.map(({ key, label }) => (
                <FilterChip
                  key={key}
                  active={kitFilter === key}
                  onClick={() => setKitFilter(key)}
                  label={label}
                />
              ))}
            </div>
          )}

          {/* File type sub-filter chips (for files tab) */}
          {activeLevel === 'files' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUB_TABS.files.map(({ key, label }) => {
                const count = fileTypeCounts[key as keyof typeof fileTypeCounts] || 0;
                // Always show all sub-tabs
                return (
                  <FilterChip
                    key={key}
                    active={fileTypeFilter === key as FileTypeFilter}
                    onClick={() => setFileTypeFilter(key as FileTypeFilter)}
                    label={label}
                    count={count}
                  />
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && <Alert variant="error">{error}</Alert>}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Text color="secondary">Assets laden...</Text>
            </div>
          )}

          {/* Brand Assets Grid (org, club, team - not member or files) */}
          {activeLevel !== 'files' && activeLevel !== 'member' && !loading && (
            filteredBrandAssets.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}>
                {filteredBrandAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            ) : (
              <EmptyState icon="🏷️" message="Geen assets gevonden." sub={
                brandAssets.length > 0 ? 'Pas je filters of zoekopdracht aan.' : "Upload assets via Brand Identity."
              } />
            )
          )}

          {/* Member Media Grid */}
          {activeLevel === 'member' && !loading && (
            filteredMemberMedia.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}>
                {filteredMemberMedia.map((item) => (
                  <MemberMediaCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState icon="👤" message="Geen speler media gevonden." sub={
                memberMedia.length > 0 ? 'Pas je filters of zoekopdracht aan.' : "Genereer speler assets via de team/seizoen pagina."
              } />
            )
          )}

          {/* File Assets Grid */}
          {activeLevel === 'files' && !loading && (
            filteredFiles.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}>
                {filteredFiles.map((file) => (
                  <FileCard key={file.id} file={file} onDownload={handleDownload} />
                ))}
              </div>
            ) : (
              <EmptyState icon="📁" message="Geen bestanden gevonden." sub={
                files.length > 0 ? 'Pas je zoekopdracht aan.' : 'Upload bestanden om ze hier te zien.'
              } />
            )
          )}

          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <Text size="xs" color="secondary">
              {activeLevel === 'files'
                ? `${filteredFiles.length} van ${files.length} bestanden`
                : activeLevel === 'member'
                ? `${filteredMemberMedia.length} van ${memberMedia.length} speler media`
                : `${filteredBrandAssets.length} van ${brandAssets.length} assets`
              }
            </Text>
          </div>
        </Stack>
      </div>
    </div>
  );
};

// ============================================================================
// Reusable sub-components
// ============================================================================

function FilterChip({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: active ? 600 : 400,
        border: `1px solid ${active ? 'var(--color-primary, #2563eb)' : 'var(--app-border)'}`,
        backgroundColor: active ? 'var(--color-primary-light, #dbeafe)' : 'transparent',
        color: active ? 'var(--color-primary, #2563eb)' : 'var(--app-text-secondary)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 8,
          backgroundColor: active ? 'var(--color-primary, #2563eb)' : 'var(--app-surface-2, #f3f4f6)',
          color: active ? '#fff' : 'var(--app-text-secondary)',
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ icon, message, sub }: { icon: string; message: string; sub: string }) {
  return (
    <Card style={{ textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>{icon}</div>
      <Text color="secondary">{message}</Text>
      <Text size="sm" color="secondary" style={{ marginTop: 4 }}>{sub}</Text>
    </Card>
  );
}

export default MediaLibraryPage;
