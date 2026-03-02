import React, { useEffect, useState } from 'react';
import { Alert, Button, Card } from '@django-core/design-system';
import { KIT_TYPES, getCsrfToken, type Project, type KitAsset } from './clubOrgDetailHelpers';

/* ─── ClubKitsTab ──────────────────────────────────────────── */

interface ClubKitsTabProps {
  club: Project;
  apiBaseUrl: string;
  brandProfileId: string | null;
  orgId: string;
  onKitUploaded?: () => void;
}

export function ClubKitsTab({ club, apiBaseUrl, brandProfileId, orgId, onKitUploaded }: ClubKitsTabProps) {
  const [kits, setKits] = useState<KitAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedKitType, setSelectedKitType] = useState<string | null>(null);

  const loadKits = React.useCallback(async () => {
    if (!brandProfileId) { setLoading(false); return; }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/branding/assets/?profile=${brandProfileId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load assets: ${res.status}`);
      const json = await res.json();
      const assets = json?.data?.results || json?.data || json?.results || [];
      const assetList = Array.isArray(assets) ? assets : [];
      const kitAssets = assetList.filter((a: any) => String(a.asset_type || '').startsWith('kit_'));
      setKits(kitAssets);
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
    if (!brandProfileId || !orgId || !club?.slug) {
      setError('No brand profile, organization or club slug available');
      return;
    }
    setUploadingType(kitTypeId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');
      const pathPrefix = `kits/${club.slug}/${kitTypeId}`;
      const fileRes = await fetch(`${apiBaseUrl}/api/v1/files/?path_prefix=${encodeURIComponent(pathPrefix)}`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-Organization-ID': orgId, 'X-CSRFToken': getCsrfToken() },
        body: formData,
      });
      if (!fileRes.ok) { const errText = await fileRes.text(); throw new Error(`File upload failed: ${fileRes.status} - ${errText}`); }
      const fileData = await fileRes.json();
      const fileId = fileData?.data?.id || fileData?.id;
      if (!fileId) throw new Error('No file ID returned from upload');

      const existingKit = kits.find((k) => k.asset_type === kitTypeId);
      if (existingKit) {
        const updateRes = await fetch(`${apiBaseUrl}/api/v1/branding/assets/${existingKit.id}/`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
          body: JSON.stringify({ file: fileId }),
        });
        if (!updateRes.ok) throw new Error(`Failed to update brand asset: ${updateRes.status}`);
      } else {
        const assetRes = await fetch(`${apiBaseUrl}/api/v1/branding/assets/`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
          body: JSON.stringify({
            profile: brandProfileId, file: fileId, asset_type: kitTypeId,
            alt_text: `${club.name} ${KIT_TYPES.find((t) => t.id === kitTypeId)?.label || kitTypeId}`,
            is_active: true,
          }),
        });
        if (!assetRes.ok) { const errText = await assetRes.text(); throw new Error(`Failed to create brand asset: ${assetRes.status} - ${errText}`); }
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
    return (<Card className="p-24"><div className="text-center text-muted">Loading kits...</div></Card>);
  }
  if (!brandProfileId) {
    return (<Card className="p-24"><Alert variant="warning">No brand profile found for this club. Create a brand profile on the Identity tab first to manage kits.</Alert></Card>);
  }

  return (
    <div className="space-y-6">
      <Card className="p-24">
        <h3 className="m-0 mb-8">Club Kits / Tenues</h3>
        <p className="text-muted fs-13 mb-24">Manage your club's kit designs for different roles and occasions.</p>

        {error && <Alert variant="error" className="mb-16">{error}</Alert>}

        <div className="grid gap-20" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {KIT_TYPES.map((kitType) => {
            const kit = getKitForType(kitType.id);
            const imageUrl = getKitImageUrl(kit);
            return (
              <div key={kitType.id} className="border rounded-12 p-16 bg-surface">
                <div className="fw-600 mb-4">{kitType.label}</div>
                <div className="fs-12 text-muted mb-16">{kitType.description}</div>
                <div className="w-full rounded-8 flex-center overflow-hidden mb-12" style={{ aspectRatio: '3/4', backgroundColor: 'var(--app-surface-secondary)' }}>
                  {uploadingType === kitType.id ? (
                    <div className="text-center text-muted">
                      <div className="mb-8 fs-24">{'\u23f3'}</div>
                      <div className="fs-12">Uploading...</div>
                    </div>
                  ) : imageUrl ? (
                    <img src={imageUrl} alt={kitType.label} className="w-full h-full" style={{ objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="text-center text-muted">
                      <div className="mb-8" style={{ fontSize: 48, opacity: 0.3 }}>{'\ud83d\udc55'}</div>
                      <div className="fs-12">No image uploaded</div>
                    </div>
                  )}
                </div>
                <div className="flex-row gap-8">
                  <Button size="sm" variant="outline" className="flex-1" disabled={uploadingType === kitType.id} onClick={() => triggerUpload(kitType.id)}>
                    {uploadingType === kitType.id ? 'Uploading...' : kit ? 'Replace' : 'Upload'}
                  </Button>
                  {kit && (
                    <Button size="sm" variant="outline" onClick={() => { if (imageUrl) window.open(imageUrl, '_blank'); }}>View</Button>
                  )}
                </div>
                {kit && <div className="mt-8 fs-11 text-muted"><strong>File:</strong> {kit.file_details?.name || 'Unknown'}</div>}
              </div>
            );
          })}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
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
