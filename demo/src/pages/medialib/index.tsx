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
    { key: 'profile', label: 'Foto' },
    { key: 'closeup', label: 'Close-up' },
    { key: 'in_tenue', label: 'In Tenue' },
    { key: 'intro', label: 'Short Intro' },
    { key: 'celebration', label: 'Celebration' },
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

function MemberMediaCard({ item }: { item: { id: string; title: string; file_url: string | null; mime_type: string; file_size_bytes?: number; extraction_metadata?: Record<string, unknown>; project?: { id: string; name: string } | string } }) {
  const isVideo = item.mime_type?.startsWith('video/');
  const assetType = (item.extraction_metadata?.asset_type as string) || 'member_foto';

  // Map asset types to friendly labels
  const assetTypeLabels: Record<string, string> = {
    member_closeup: 'Close-up',
    member_in_tenue: 'In Tenue',
    member_foto: 'Foto',
    member_intro: 'Intro Video',
    member_celebration: 'Celebration',
  };
  const friendlyType = assetTypeLabels[assetType] || assetType.replace('member_', '').replace(/_/g, ' ');

  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Thumbnail */}
      <div style={{
        height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--app-bg)', borderBottom: '1px solid var(--app-border)',
        overflow: 'hidden', position: 'relative',
      }}>
        {item.file_url ? (
          isVideo ? (
            <video
              src={item.file_url}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={item.file_url}
              alt={item.title}
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
          {item.title || 'Member Media'}
        </Text>
        <Text size="xs" color="secondary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {typeof item.project === 'object' ? item.project?.name : '—'}
        </Text>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Badge size="sm" variant="default">{friendlyType}</Badge>
          {item.mime_type && (
            <Badge size="sm" variant="default" style={{ opacity: 0.7 }}>
              {item.mime_type.split('/')[1]?.toUpperCase() || item.mime_type}
            </Badge>
          )}
        </div>
        {item.file_size_bytes && item.file_size_bytes > 0 && (
          <Text size="xs" color="secondary" style={{ marginTop: 2 }}>
            {formatFileSize(item.file_size_bytes)}
          </Text>
        )}
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

  // Member media items state (closeups, in_tenue, intro videos, etc.)
  interface MemberMediaItem {
    id: string;
    title: string;
    file_url: string | null;
    storage_path: string | null;
    mime_type: string;
    file_size_bytes?: number;
    state: string;
    created_at: string;
    extraction_metadata?: Record<string, unknown>;
    project?: { id: string; name: string } | string;
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
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Comprehensive asset fetching: org-level + ALL project-level brand profiles
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

      // Step 1: Fetch org-level brand profiles (no project attached)
      const rawOrgProfiles = await fetchPaginated<any>(
        `${apiBaseUrl}/api/v1/branding/profiles/?organisation=${orgId}&page_size=100`,
      );

      // Enrich org profiles - filter to only those without a project (true org-level)
      const orgProfiles = rawOrgProfiles
        .filter((p: any) => !p.project)  // Only keep profiles where project is null/undefined
        .map((p: any) => ({
          ...p,
          project_id: null,
          project_name: null,
          project_type: null,  // Explicitly null for org-level
          parent_project_id: null,
        }));

      console.log('[MediaLib] Org-level brand profiles:', orgProfiles.length);

      // Step 2: Fetch ALL projects for this organisation (clubs + teams)
      const allProjects = await fetchPaginated<any>(
        `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000`,
      );

      // Separate clubs and teams - parent_id is returned by API (not parent_project)
      const clubProjects = allProjects.filter((p: any) => !p.parent_id);
      const teamProjects = allProjects.filter((p: any) => !!p.parent_id);
      console.log('[MediaLib] Projects loaded:', { clubs: clubProjects.length, teams: teamProjects.length });

      // Step 3: Fetch brand profiles for each project
      const projectProfilePromises = allProjects.map(async (project: any) => {
        try {
          const profiles = await fetchPaginated<any>(
            `${apiBaseUrl}/api/v1/branding/profiles/?project=${project.id}&page_size=100`,
          );
          // Check parent_id (API returns parent_id, not parent_project)
          const isTeam = !!project.parent_id;
          return profiles.map((p: any) => ({
            ...p,
            project_id: String(project.id),
            project_name: project.name,
            project_type: isTeam ? 'team' : 'club',
            parent_project_id: project.parent_id ? String(project.parent_id) : null,
          }));
        } catch {
          return [];
        }
      });

      const projectProfiles = (await Promise.all(projectProfilePromises)).flat();
      const allProfiles = [...orgProfiles, ...projectProfiles];

      console.log('[MediaLib] Total brand profiles:', {
        org: orgProfiles.length,
        project: projectProfiles.length,
        total: allProfiles.length,
      });

      // Step 4: Fetch assets for each profile
      const assetPromises = allProfiles.map(async (profile: any) => {
        try {
          const assets = await fetchPaginated<BrandAsset>(
            `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/assets/?page_size=100`,
          );
          return assets.map((a: BrandAsset) => ({
            ...a,
            profile_name: profile.name,
            project_id: profile.project_id ?? null,
            project_name: profile.project_name ?? null,
            project_type: profile.project_type ?? null,  // Explicit null for org-level
            parent_project_id: profile.parent_project_id ?? null,
            organisation_name: profile.organisation_name ?? null,
          }));
        } catch {
          return [];
        }
      });

      const allAssets = (await Promise.all(assetPromises)).flat();

      // Log asset breakdown by hierarchy level
      const orgAssets = allAssets.filter((a: any) => a.project_type === null);
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

  // Fetch member media items (closeups, in_tenue, intro videos, celebration videos)
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

      // Fetch all projects first
      const allProjects = await fetchPaginated<any>(
        `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000`,
      );

      // Fetch media items for each project (teams have member assets)
      const teamProjects = allProjects.filter((p: any) => !!p.parent_id);
      const mediaPromises = teamProjects.map(async (team: any) => {
        try {
          const items = await fetchPaginated<any>(
            `${apiBaseUrl}/api/v1/media/items/?project=${team.id}&page_size=500`,
          );
          // Filter to member-related asset types
          return items.filter((item: any) => {
            const assetType = item.extraction_metadata?.asset_type || '';
            return assetType.startsWith('member_') ||
                   assetType.includes('closeup') ||
                   assetType.includes('in_tenue') ||
                   assetType.includes('intro') ||
                   assetType.includes('celebration') ||
                   assetType.includes('profile') ||
                   assetType === 'headshot';
          }).map((item: any) => ({
            ...item,
            project_id: String(team.id),
            project_name: team.name,
          }));
        } catch {
          return [];
        }
      });

      const memberItems = (await Promise.all(mediaPromises)).flat();
      console.log('[MediaLib] Member media items loaded:', memberItems.length);
      setMemberMedia(memberItems);
    } catch (err) {
      console.error('[MediaLib] Failed to fetch member media:', err);
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

    // Level filter - use project_type directly for accurate filtering
    if (activeLevel === 'organisation') {
      // Org-level: project_type is null
      result = result.filter(a => (a as any).project_type === null);
    } else if (activeLevel === 'club') {
      // Club-level: project_type is 'club'
      result = result.filter(a => (a as any).project_type === 'club');
    } else if (activeLevel === 'team') {
      // Team-level: project_type is 'team'
      result = result.filter(a => (a as any).project_type === 'team');
    } else if (activeLevel === 'member') {
      // Member tab uses memberMedia, not brandAssets - return empty
      result = [];
    }

    // Club filter - match by project_id or parent_project_id
    if (selectedClubId) {
      result = result.filter(a => {
        const assetProjectId = (a as any).project_id;
        const assetParentProjectId = (a as any).parent_project_id;
        // Match if asset's project is the selected club, OR if asset's parent is the club (for team assets)
        return String(assetProjectId) === String(selectedClubId) ||
               String(assetParentProjectId) === String(selectedClubId);
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
        const contentType = getContentType(result[0]?.asset_type || '');
        result = result.filter(a => {
          const ct = getContentType(a.asset_type);
          return ct === subFilter;
        });
      }
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
  }, [brandAssets, activeLevel, subFilter, selectedClubId, selectedTeamId, clubs, teams, searchQuery]);

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

    let result = memberMedia;

    // Team filter
    if (selectedTeamId) {
      result = result.filter(item => String((item as any).project_id) === String(selectedTeamId));
    }

    // Club filter - match team's parent
    if (selectedClubId && !selectedTeamId) {
      const teamIds = teams
        .filter(t => String(t.parent_id) === String(selectedClubId))
        .map(t => String(t.id));
      result = result.filter(item => teamIds.includes(String((item as any).project_id)));
    }

    // Sub-filter (member content type)
    if (subFilter !== 'all') {
      result = result.filter(item => {
        const assetType = (item.extraction_metadata?.asset_type as string) || '';
        const memberType = getMemberContentType(assetType);
        return memberType === subFilter;
      });
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title?.toLowerCase().includes(q) ||
        ((item.extraction_metadata?.asset_type as string) || '').toLowerCase().includes(q) ||
        (item as any).project_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [memberMedia, activeLevel, subFilter, selectedClubId, selectedTeamId, teams, searchQuery]);

  // Sub-tab counts for current level
  const subTabCounts = useMemo(() => {
    // For member tab, use memberMedia
    if (activeLevel === 'member') {
      let relevantItems = memberMedia;

      // Apply club/team filters to count
      if (selectedTeamId) {
        relevantItems = relevantItems.filter(item => String((item as any).project_id) === String(selectedTeamId));
      } else if (selectedClubId) {
        const teamIds = teams
          .filter(t => String(t.parent_id) === String(selectedClubId))
          .map(t => String(t.id));
        relevantItems = relevantItems.filter(item => teamIds.includes(String((item as any).project_id)));
      }

      const counts: Record<string, number> = { all: relevantItems.length };
      relevantItems.forEach(item => {
        const assetType = (item.extraction_metadata?.asset_type as string) || '';
        const ct = getMemberContentType(assetType);
        counts[ct] = (counts[ct] || 0) + 1;
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
  active: boolean; onClick: () => void; label: string; count: number;
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
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 8,
        backgroundColor: active ? 'var(--color-primary, #2563eb)' : 'var(--app-surface-2, #f3f4f6)',
        color: active ? '#fff' : 'var(--app-text-secondary)',
      }}>
        {count}
      </span>
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
