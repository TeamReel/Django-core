/**
 * Media Library Page — Unified Asset Browser
 *
 * Shows all brand assets and file uploads for the active organisation,
 * organized by hierarchy level (Club, Team, Member) with content-type
 * sub-filters (Logo, Tenue, Sponsor, Close-up, In Tenue, Lineup).
 *
 * Data sources:
 * - Brand Assets via /api/v1/branding/profiles → assets
 * - File Assets via /api/v1/files/
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Stack, Text, Alert, Badge } from '@django-core/design-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  useBrandAssets,
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
// Tab types
// ============================================================================

type LevelTab = 'all' | 'club' | 'team' | 'member' | 'files';

const LEVEL_TABS: { key: LevelTab; label: string; icon: string }[] = [
  { key: 'all', label: 'Alles', icon: '📚' },
  { key: 'club', label: 'Club', icon: '🏟️' },
  { key: 'team', label: 'Team', icon: '👥' },
  { key: 'member', label: 'Speler', icon: '🧑' },
  { key: 'files', label: 'Bestanden', icon: '📁' },
];

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
// Main Page
// ============================================================================

const MediaLibraryPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { context } = useContextSwitcher();
  const orgId = (context as any)?.organisation?.id as string | undefined;

  // Read tab from URL
  const rawTab = new URLSearchParams(location.search).get('tab') || 'all';
  const activeLevel: LevelTab = (['all', 'club', 'team', 'member', 'files'].includes(rawTab) ? rawTab : 'all') as LevelTab;

  // Data hooks
  const { assets: brandAssets, loading: brandLoading, error: brandError, fetchAssets } = useBrandAssets();
  const { files, loading: filesLoading, error: filesError, fetchFiles, getDownloadUrl } = useFileAssets();

  // Sub-filter state
  const [contentFilter, setContentFilter] = useState<ContentType | 'all'>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Top-level entity filter (optional: filter by specific club/team)
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const setActiveLevel = (tab: LevelTab) => {
    navigate(`/medialib?tab=${tab}`, { replace: true });
    setContentFilter('all');
    setFileTypeFilter('all');
    setSearchQuery('');
  };

  // Fetch on mount
  useEffect(() => {
    if (orgId) {
      fetchAssets(orgId);
      fetchFiles(orgId);
    }
  }, [orgId, fetchAssets, fetchFiles]);

  // ── Derived data ──────────────────────────────────────────────────────

  // Unique entities (for top filter dropdown)
  const entities = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>();
    brandAssets.forEach(a => {
      const key = a.project_name || a.profile_name || '';
      if (key && !map.has(key)) {
        map.set(key, { name: key, type: a.project_type || 'org' });
      }
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val })).sort((a, b) => a.name.localeCompare(b.name));
  }, [brandAssets]);

  // Filter brand assets by level + content type + search + entity
  const filteredBrandAssets = useMemo(() => {
    let result = brandAssets;

    // Level filter
    if (activeLevel !== 'all' && activeLevel !== 'files') {
      result = result.filter(a => getHierarchyLevel(a) === activeLevel);
    }

    // Content type sub-filter
    if (contentFilter !== 'all') {
      result = result.filter(a => getContentType(a.asset_type) === contentFilter);
    }

    // Entity filter
    if (entityFilter !== 'all') {
      result = result.filter(a => (a.project_name || a.profile_name) === entityFilter);
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
  }, [brandAssets, activeLevel, contentFilter, entityFilter, searchQuery]);

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

  // Content type counts (for chips) — based on current level
  const contentTypeCounts = useMemo(() => {
    const levelAssets = activeLevel === 'all' || activeLevel === 'files'
      ? brandAssets
      : brandAssets.filter(a => getHierarchyLevel(a) === activeLevel);
    const counts: Record<string, number> = { all: levelAssets.length };
    levelAssets.forEach(a => {
      const ct = getContentType(a.asset_type);
      counts[ct] = (counts[ct] || 0) + 1;
    });
    return counts;
  }, [brandAssets, activeLevel]);

  // File type counts
  const fileTypeCounts = useMemo(() => ({
    all: files.length,
    image: files.filter(f => getFileTypeFilter(f.mime_type) === 'image').length,
    video: files.filter(f => getFileTypeFilter(f.mime_type) === 'video').length,
    document: files.filter(f => getFileTypeFilter(f.mime_type) === 'document').length,
    font: files.filter(f => getFileTypeFilter(f.mime_type) === 'font').length,
  }), [files]);

  // Level counts (for tabs)
  const levelCounts = useMemo(() => ({
    all: brandAssets.length,
    club: brandAssets.filter(a => getHierarchyLevel(a) === 'club').length,
    team: brandAssets.filter(a => getHierarchyLevel(a) === 'team').length,
    member: brandAssets.filter(a => getHierarchyLevel(a) === 'member').length,
    files: files.length,
  }), [brandAssets, files]);

  const loading = brandLoading || (activeLevel === 'files' && filesLoading);
  const error = activeLevel === 'files' ? filesError : brandError;

  const handleDownload = async (fileId: string) => {
    const url = await getDownloadUrl(fileId);
    if (url) window.open(url, '_blank');
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
      <div style={{ padding: '24px 24px 0', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <Stack direction="column" gap="1">
          <Text size="xl" weight="bold">Media Library</Text>
          <Text size="md" color="secondary">
            Alle brand assets en bestanden van je organisatie.
          </Text>
        </Stack>

        {/* Level tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16, overflow: 'auto' }}>
          {LEVEL_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveLevel(tab.key)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: activeLevel === tab.key ? 700 : 500,
                borderBottom: activeLevel === tab.key ? '2px solid var(--color-primary, #2563eb)' : '2px solid transparent',
                background: 'none', border: 'none', borderBottomStyle: 'solid',
                color: activeLevel === tab.key ? 'var(--color-primary, #2563eb)' : 'var(--app-text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                backgroundColor: activeLevel === tab.key ? 'var(--color-primary, #2563eb)' : 'var(--app-surface-2, #f3f4f6)',
                color: activeLevel === tab.key ? '#fff' : 'var(--app-text-secondary)',
              }}>
                {levelCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar: search + entity filter */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--app-border)' }}>
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
        {activeLevel !== 'files' && entities.length > 1 && (
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface)', fontSize: 13, minWidth: 160,
            }}
          >
            <option value="all">Alle entiteiten</option>
            {entities.map(e => (
              <option key={e.key} value={e.key}>
                {e.type === 'club' ? '🏟️' : e.type === 'team' ? '👥' : '🏢'} {e.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content area */}
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <Stack direction="column" gap="4">

          {/* Content type sub-filter chips (for brand tabs) */}
          {activeLevel !== 'files' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <FilterChip active={contentFilter === 'all'} onClick={() => setContentFilter('all')} label="Alles" count={contentTypeCounts.all || 0} />
              {(['logo', 'kit', 'sponsor', 'closeup', 'in_tenue', 'lineup', 'location', 'font', 'other'] as ContentType[])
                .filter(ct => (contentTypeCounts[ct] || 0) > 0)
                .map(ct => (
                  <FilterChip
                    key={ct}
                    active={contentFilter === ct}
                    onClick={() => setContentFilter(ct)}
                    label={CONTENT_TYPE_LABELS[ct]}
                    count={contentTypeCounts[ct] || 0}
                  />
                ))
              }
            </div>
          )}

          {/* File type sub-filter chips (for files tab) */}
          {activeLevel === 'files' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { key: 'all' as FileTypeFilter, label: 'Alles', count: fileTypeCounts.all },
                { key: 'image' as FileTypeFilter, label: 'Afbeeldingen', count: fileTypeCounts.image },
                { key: 'video' as FileTypeFilter, label: "Video's", count: fileTypeCounts.video },
                { key: 'document' as FileTypeFilter, label: 'Documenten', count: fileTypeCounts.document },
                { key: 'font' as FileTypeFilter, label: 'Fonts', count: fileTypeCounts.font },
              ]).filter(c => c.count > 0 || c.key === 'all').map(cat => (
                <FilterChip
                  key={cat.key}
                  active={fileTypeFilter === cat.key}
                  onClick={() => setFileTypeFilter(cat.key)}
                  label={cat.label}
                  count={cat.count}
                />
              ))}
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

          {/* Brand Assets Grid */}
          {activeLevel !== 'files' && !loading && (
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
              <EmptyState icon="🏷️" message="Geen brand assets gevonden." sub={
                brandAssets.length > 0 ? 'Pas je filters of zoekopdracht aan.' : "Upload logo's en tenues via Brand Identity."
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
                : `${filteredBrandAssets.length} van ${brandAssets.length} brand assets`
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
