/**
 * Media Library Page — Unified Asset Browser
 *
 * Shows all real content for the active organisation:
 * - Brand Assets (logos, kits, sponsors) via /api/v1/branding/
 * - File Assets (raw uploads) via /api/v1/files/
 *
 * Replaces the old MediaItem-based page which showed 0 results because
 * the MediaItem table was empty. BrandAssets and FileAssets contain the
 * actual content (71+ brand assets, 66+ file assets on production).
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, Stack, Text, Alert, Badge } from '@django-core/design-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBrandAssets, getAssetCategory, getAssetTypeLabel, type AssetCategory, type BrandAsset } from '../../hooks/useBrandAssets';
import { useFileAssets, getFileIcon, formatFileSize, getFileTypeFilter, type FileAsset, type FileTypeFilter } from '../../hooks/useFileAssets';

type ViewTab = 'brand' | 'files';

const MediaLibraryPage: React.FC = () => {
  const { context } = useContextSwitcher();
  const orgId = (context as any)?.organisation?.id as string | undefined;

  // Brand assets
  const { assets: brandAssets, loading: brandLoading, error: brandError, fetchAssets } = useBrandAssets();
  // File assets
  const { files, loading: filesLoading, error: filesError, fetchFiles, getDownloadUrl } = useFileAssets();

  const [activeTab, setActiveTab] = useState<ViewTab>('brand');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch on mount when org is available
  useEffect(() => {
    if (orgId) {
      fetchAssets(orgId);
      fetchFiles(orgId);
    }
  }, [orgId, fetchAssets, fetchFiles]);

  // Filtered brand assets
  const filteredBrandAssets = useMemo(() => {
    let result = brandAssets;
    if (categoryFilter !== 'all') {
      result = result.filter(a => getAssetCategory(a.asset_type) === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.asset_type_label?.toLowerCase().includes(q) ||
        a.alt_text?.toLowerCase().includes(q) ||
        a.profile_name?.toLowerCase().includes(q) ||
        a.file_details?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [brandAssets, categoryFilter, searchQuery]);

  // Filtered file assets
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

  const loading = activeTab === 'brand' ? brandLoading : filesLoading;
  const error = activeTab === 'brand' ? brandError : filesError;

  // Category counts for brand assets
  const categoryCounts = useMemo(() => ({
    all: brandAssets.length,
    logo: brandAssets.filter(a => getAssetCategory(a.asset_type) === 'logo').length,
    kit: brandAssets.filter(a => getAssetCategory(a.asset_type) === 'kit').length,
    sponsor: brandAssets.filter(a => getAssetCategory(a.asset_type) === 'sponsor').length,
    other: brandAssets.filter(a => getAssetCategory(a.asset_type) === 'other').length,
  }), [brandAssets]);

  // File type counts
  const fileTypeCounts = useMemo(() => ({
    all: files.length,
    image: files.filter(f => getFileTypeFilter(f.mime_type) === 'image').length,
    video: files.filter(f => getFileTypeFilter(f.mime_type) === 'video').length,
    document: files.filter(f => getFileTypeFilter(f.mime_type) === 'document').length,
    font: files.filter(f => getFileTypeFilter(f.mime_type) === 'font').length,
  }), [files]);

  const handleDownload = async (fileId: string) => {
    const url = await getDownloadUrl(fileId);
    if (url) window.open(url, '_blank');
  };

  if (!orgId) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)', padding: '24px' }}>
        <Alert variant="info">Select an organisation to view the media library.</Alert>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <Stack direction="column" gap="1">
          <Text size="xl" weight="bold">Media Library</Text>
          <Text size="md" color="secondary">
            Brand assets, uploads and files for your organisation.
          </Text>
        </Stack>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <Stack direction="column" gap="4">

          {/* Tab bar + search */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: '8px', padding: '3px' }}>
              <button
                onClick={() => { setActiveTab('brand'); setSearchQuery(''); }}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '13px',
                  backgroundColor: activeTab === 'brand' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                  color: activeTab === 'brand' ? '#fff' : 'inherit',
                }}
              >
                Brand Assets ({brandAssets.length})
              </button>
              <button
                onClick={() => { setActiveTab('files'); setSearchQuery(''); }}
                style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '13px',
                  backgroundColor: activeTab === 'files' ? 'var(--color-primary, #3b82f6)' : 'transparent',
                  color: activeTab === 'files' ? '#fff' : 'inherit',
                }}
              >
                Files ({files.length})
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'brand' ? 'Search assets...' : 'Search files...'}
              style={{
                flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px',
                border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Category filter chips */}
          {activeTab === 'brand' ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {([
                { key: 'all' as AssetCategory, label: 'All', count: categoryCounts.all },
                { key: 'logo' as AssetCategory, label: 'Logos', count: categoryCounts.logo },
                { key: 'kit' as AssetCategory, label: 'Kits', count: categoryCounts.kit },
                { key: 'sponsor' as AssetCategory, label: 'Sponsors', count: categoryCounts.sponsor },
                { key: 'other' as AssetCategory, label: 'Other', count: categoryCounts.other },
              ]).filter(c => c.count > 0 || c.key === 'all').map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                  style={{
                    padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--app-border)',
                    fontSize: '12px', cursor: 'pointer', fontWeight: 500,
                    backgroundColor: categoryFilter === cat.key ? 'var(--color-primary, #3b82f6)' : 'var(--app-surface)',
                    color: categoryFilter === cat.key ? '#fff' : 'inherit',
                  }}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {([
                { key: 'all' as FileTypeFilter, label: 'All', count: fileTypeCounts.all },
                { key: 'image' as FileTypeFilter, label: 'Images', count: fileTypeCounts.image },
                { key: 'video' as FileTypeFilter, label: 'Videos', count: fileTypeCounts.video },
                { key: 'document' as FileTypeFilter, label: 'Documents', count: fileTypeCounts.document },
                { key: 'font' as FileTypeFilter, label: 'Fonts', count: fileTypeCounts.font },
              ]).filter(c => c.count > 0 || c.key === 'all').map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setFileTypeFilter(cat.key)}
                  style={{
                    padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--app-border)',
                    fontSize: '12px', cursor: 'pointer', fontWeight: 500,
                    backgroundColor: fileTypeFilter === cat.key ? 'var(--color-primary, #3b82f6)' : 'var(--app-surface)',
                    color: fileTypeFilter === cat.key ? '#fff' : 'inherit',
                  }}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && <Alert variant="error">{error}</Alert>}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <Text color="secondary">Loading assets...</Text>
            </div>
          )}

          {/* Brand Assets Grid */}
          {activeTab === 'brand' && !loading && (
            filteredBrandAssets.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px',
              }}>
                {filteredBrandAssets.map((asset: BrandAsset) => (
                  <Card key={asset.id} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Thumbnail area */}
                    <div style={{
                      height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'var(--app-bg)', borderBottom: '1px solid var(--app-border)',
                      overflow: 'hidden',
                    }}>
                      {asset.url ? (
                        <img
                          src={asset.url}
                          alt={asset.alt_text || asset.asset_type_label || asset.asset_type}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '8px' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span style={{ fontSize: '32px', opacity: 0.4 }}>
                          {asset.asset_type.includes('kit') ? '👕' : asset.asset_type.includes('logo') ? '🏷️' : '📁'}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <Text weight="bold" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {asset.asset_type_label || getAssetTypeLabel(asset.asset_type)}
                      </Text>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Badge size="sm" variant="primary">{getAssetCategory(asset.asset_type)}</Badge>
                        {asset.profile_name && (
                          <Badge size="sm" variant="default">{asset.profile_name}</Badge>
                        )}
                      </div>
                      {asset.file_details && (
                        <Text size="xs" color="secondary">
                          {asset.file_details.name} &middot; {formatFileSize(asset.file_details.size)}
                        </Text>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>🏷️</div>
                <Text color="secondary">No brand assets found.</Text>
                <Text size="sm" color="secondary" style={{ marginTop: '4px' }}>
                  {brandAssets.length > 0 ? 'Try adjusting your search or filters.' : 'Upload logos and kits via the Brand Identity settings.'}
                </Text>
              </Card>
            )
          )}

          {/* File Assets Grid */}
          {activeTab === 'files' && !loading && (
            filteredFiles.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '16px',
              }}>
                {filteredFiles.map((file: FileAsset) => (
                  <Card key={file.id} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Thumbnail / icon */}
                    <div style={{
                      height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'var(--app-bg)', borderBottom: '1px solid var(--app-border)',
                    }}>
                      <span style={{ fontSize: '40px' }}>{getFileIcon(file.mime_type)}</span>
                    </div>
                    {/* Info */}
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <Text weight="bold" size="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.original_name || 'Unnamed file'}
                      </Text>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Badge size="sm" variant="default">{file.mime_type.split('/')[1] || file.mime_type}</Badge>
                        {file.is_public && <Badge size="sm" variant="primary">Public</Badge>}
                      </div>
                      <Text size="xs" color="secondary">
                        {formatFileSize(file.file_size)}
                        {file.uploaded_by_name && <> &middot; {file.uploaded_by_name}</>}
                      </Text>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(file.id)}
                        style={{ marginTop: '4px', alignSelf: 'flex-start' }}
                      >
                        Download
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>📁</div>
                <Text color="secondary">No files found.</Text>
                <Text size="sm" color="secondary" style={{ marginTop: '4px' }}>
                  {files.length > 0 ? 'Try adjusting your search or filter.' : 'Upload files to see them here.'}
                </Text>
              </Card>
            )
          )}

          {/* Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <Text size="xs" color="secondary">
              {activeTab === 'brand'
                ? `${filteredBrandAssets.length} of ${brandAssets.length} brand assets`
                : `${filteredFiles.length} of ${files.length} files`
              }
            </Text>
          </div>

        </Stack>
      </div>
    </div>
  );
};

export default MediaLibraryPage;
