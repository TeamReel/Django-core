/**
 * KitsTab — Shared kit upload/management component
 *
 * Extracted from ClubOrganisationDetailPage's ClubKitsTab.
 * Used on Club, Team, and Season detail pages to upload and manage kit images.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Alert, Button } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

// ============================================================================
// Types & Constants
// ============================================================================

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

interface KitsTabProps {
  /** Project slug or ID (used in S3 path prefix) */
  projectSlug: string;
  /** Project display name */
  projectName: string;
  /** Brand profile ID (required to link assets) */
  brandProfileId: string | null;
  /** Organisation ID (required for file upload header) */
  orgId: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Callback when a kit is uploaded */
  onKitUploaded?: () => void;
}

import { getCsrfToken } from '../../utils/csrf';

// ============================================================================
// Component
// ============================================================================

export function KitsTab({
  projectSlug,
  projectName,
  brandProfileId,
  orgId,
  readOnly = false,
  onKitUploaded,
}: KitsTabProps) {
  const apiBaseUrl = getApiBaseUrl();
  const [kits, setKits] = useState<KitAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedKitType, setSelectedKitType] = useState<string | null>(null);

  const loadKits = useCallback(async () => {
    if (!brandProfileId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/branding/assets/?profile=${brandProfileId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to load assets: ${res.status}`);

      const json = await res.json();
      const assets = json?.data?.results || json?.data || json?.results || [];
      const assetList = Array.isArray(assets) ? assets : [];

      setKits(assetList.filter((a: any) => String(a.asset_type || '').startsWith('kit_')));
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load kits');
      setLoading(false);
    }
  }, [apiBaseUrl, brandProfileId]);

  useEffect(() => {
    let cancelled = false;
    const doLoad = async () => { if (!cancelled) await loadKits(); };
    void doLoad();
    return () => { cancelled = true; };
  }, [loadKits]);

  const handleUpload = async (file: File, kitTypeId: string) => {
    if (!brandProfileId || !orgId || !projectSlug) {
      setError('No brand profile, organization or project slug available');
      return;
    }

    setUploadingType(kitTypeId);
    setError(null);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');

      const pathPrefix = `kits/${projectSlug}/${kitTypeId}`;
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
      if (!fileId) throw new Error('No file ID returned from upload');

      // Step 2: Create or update BrandAsset
      const existingKit = kits.find((k) => k.asset_type === kitTypeId);

      if (existingKit) {
        const updateRes = await fetch(`${apiBaseUrl}/api/v1/branding/assets/${existingKit.id}/`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
          body: JSON.stringify({ file: fileId }),
        });
        if (!updateRes.ok) throw new Error(`Failed to update brand asset: ${updateRes.status}`);
      } else {
        const assetRes = await fetch(`${apiBaseUrl}/api/v1/branding/assets/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
          body: JSON.stringify({
            profile: brandProfileId,
            file: fileId,
            asset_type: kitTypeId,
            alt_text: `${projectName} ${KIT_TYPES.find((t) => t.id === kitTypeId)?.label || kitTypeId}`,
            is_active: true,
          }),
        });
        if (!assetRes.ok) {
          const errText = await assetRes.text();
          throw new Error(`Failed to create brand asset: ${assetRes.status} - ${errText}`);
        }
      }

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
    if (file && selectedKitType) void handleUpload(file, selectedKitType);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = (kitTypeId: string) => {
    setSelectedKitType(kitTypeId);
    fileInputRef.current?.click();
  };

  const getKitForType = (typeId: string): KitAsset | undefined => kits.find((k) => k.asset_type === typeId);

  const getKitImageUrl = (kit: KitAsset | undefined): string | null => {
    if (!kit?.url) return null;
    if (kit.url.startsWith('http')) return kit.url;
    return `https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/${kit.url}`;
  };

  if (loading) {
    return (
      <Card className="p-24">
        <div className="text-center text-muted">Loading kits...</div>
      </Card>
    );
  }

  if (!brandProfileId) {
    return (
      <Card className="p-24">
        <Alert variant="warning">
          No brand profile found. Create a brand profile on the Identity tab first to manage kits.
        </Alert>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-24">
        <h3 className="mb-8" style={{ marginTop: 0 }}>Kits / Tenues</h3>
        <p className="text-muted fs-13 mb-24">
          Manage kit designs for different roles and occasions.
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
                  className="w-full flex-center rounded-8 overflow-hidden mb-12"
                  style={{
                    aspectRatio: '3/4',
                    backgroundColor: 'var(--app-surface-secondary)',
                  }}
                >
                  {uploadingType === kitType.id ? (
                    <div className="text-center text-muted">
                      <div className="fs-24 mb-8">⏳</div>
                      <div className="fs-12">Uploading...</div>
                    </div>
                  ) : imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={kitType.label}
                      className="w-full h-full"
                      style={{ objectFit: 'contain' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="text-center text-muted">
                      <div className="mb-8" style={{ fontSize: 48, opacity: 0.3 }}>👕</div>
                      <div className="fs-12">No image uploaded</div>
                    </div>
                  )}
                </div>

                {!readOnly && (
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
                        onClick={() => { if (imageUrl) window.open(imageUrl, '_blank'); }}
                      >
                        View
                      </Button>
                    )}
                  </div>
                )}

                {readOnly && kit && imageUrl && (
                  <div className="flex-row gap-8">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(imageUrl, '_blank')}
                    >
                      View
                    </Button>
                  </div>
                )}

                {kit && (
                  <div className="mt-8 fs-11 text-muted">
                    <strong>File:</strong> {kit.file_details?.name || 'Unknown'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!readOnly && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        )}
      </Card>

      {!readOnly && (
        <Card className="p-24">
          <h4 className="mb-8" style={{ marginTop: 0 }}>How to add kits</h4>
          <p className="text-muted fs-13 mb-12">
            Kit images should be high-quality photos or renders showing the complete kit design.
            Recommended image size: 600x800 pixels (3:4 aspect ratio).
          </p>
          <ul className="m-0 fs-13 text-muted" style={{ paddingLeft: 20 }}>
            <li>Use PNG or JPEG format for best quality</li>
            <li>Include front view of the full kit (shirt, shorts, socks)</li>
            <li>Keep background transparent or neutral for cleaner display</li>
            <li>Upload separate images for each kit variant</li>
          </ul>
        </Card>
      )}
    </div>
  );
}

export default KitsTab;
