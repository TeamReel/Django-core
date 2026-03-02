import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Alert } from '@django-core/design-system';
import { getApiBaseUrl } from '../utils/apiBase';
import { getCsrfToken } from '../utils/csrf';

interface Club {
  id: string;
  name: string;
  slug?: string;
  metadata?: {
    identity?: {
      logo_url?: string;
      default_location?: string;
    };
  };
}

interface EditClubModalProps {
  opened: boolean;
  onClose: () => void;
  club: Club | null;
  orgId: string;
  onSave?: (updatedClub: Club) => void;
}

export default function EditClubModal({
  opened,
  onClose,
  club,
  orgId,
  onSave,
}: EditClubModalProps) {
  const apiBaseUrl = getApiBaseUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (opened && club) {
      setLogoUrl((club.metadata?.identity?.logo_url) || '');
      setDefaultLocation((club.metadata?.identity?.default_location) || '');
      setPreviewUrl((club.metadata?.identity?.logo_url) || null);
      setError(null);
    }
  }, [opened, club]);

  if (!opened || !club) return null;

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload file to FileAsset API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');

      // Use path_prefix to organize logos in S3: logos/{club_slug_or_id}/
      const pathPrefix = `logos/${club?.slug || club?.id || 'unknown'}`;
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
      const storagePath = fileData?.data?.storage_path || fileData?.storage_path;

      if (!fileId) {
        throw new Error('No file ID returned from upload');
      }

      // Construct the S3 URL
      const s3Url = `https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/${storagePath}`;

      setLogoUrl(s3Url);
      setPreviewUrl(s3Url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleLogoUpload(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(club.id))}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          metadata: {
            ...(club.metadata || {}),
            identity: {
              ...((club.metadata || {})?.identity || {}),
              logo_url: logoUrl.trim() || null,
              default_location: defaultLocation.trim() || null,
            },
          },
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || `Failed to save club settings (${res.status})`);
      }

      const raw = await res.json().catch(() => null);
      const updated = raw?.data || raw;

      onSave?.({ ...club, ...updated });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="flex-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface p-24 rounded-12 overflow-auto text-primary border"
        style={{
          width: '500px',
          maxWidth: '90%',
          maxHeight: '90vh',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        }}
      >
        <h2 className="fs-20 fw-600" style={{ marginTop: 0, marginBottom: '20px' }}>
          Edit Club Settings
        </h2>

        {error && (
          <Alert variant="error" className="mb-16">
            {error}
          </Alert>
        )}

        <div className="flex-col gap-24">
          {/* Logo Section */}
          <div>
            <label
              className="block fs-13 fw-600 mb-8 text-primary"
            >
              Club Logo
            </label>
            <div className="gap-16" style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Logo Preview */}
              <div
                className="flex-center rounded-12 overflow-hidden"
                style={{
                  width: 100,
                  height: 100,
                  border: '2px dashed var(--app-border)',
                  backgroundColor: 'var(--app-surface-secondary)',
                  flexShrink: 0,
                }}
              >
                {uploading ? (
                  <span className="fs-24">⏳</span>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="w-full h-full p-8"
                    style={{ objectFit: 'contain' }}
                    onError={() => setPreviewUrl(null)}
                  />
                ) : (
                  <span className="text-muted fw-700" style={{ fontSize: 36 }}>
                    {String(club.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-8"
                >
                  {uploading ? 'Uploading...' : previewUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="fs-12 text-muted">
                  PNG or JPG, recommended 200x200px
                </div>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      setPreviewUrl(null);
                    }}
                    className="mt-8 py-4 px-8 fs-11 bg-transparent border-none cursor-pointer"
                    style={{
                      color: '#dc3545',
                      textDecoration: 'underline',
                    }}
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Default Location */}
          <div>
            <label
              className="block fs-13 fw-600 mb-8 text-primary"
            >
              Default Match Location
            </label>
            <Input
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g., Johan Cruijff ArenA, Amsterdam"
              className="w-full"
            />
            <div className="fs-12 text-muted mt-4">
              Used to prefill the location field when creating new matches
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="gap-12 mt-24" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
