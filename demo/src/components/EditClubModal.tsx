import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Alert } from '@django-core/design-system';
import { getApiBaseUrl } from '../utils/apiBase';

// Get CSRF token from cookies
function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

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

      const fileRes = await fetch(`${apiBaseUrl}/api/v1/files/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Organization-ID': orgId,
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '12px',
          width: '500px',
          maxWidth: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: 20, fontWeight: 600 }}>
          Edit Club Settings
        </h2>

        {error && (
          <Alert variant="error" style={{ marginBottom: 16 }}>
            {error}
          </Alert>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Logo Section */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--app-text)',
              }}
            >
              Club Logo
            </label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Logo Preview */}
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 12,
                  border: '2px dashed var(--app-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--app-surface-secondary)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {uploading ? (
                  <span style={{ fontSize: 24 }}>⏳</span>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                    onError={() => setPreviewUrl(null)}
                  />
                ) : (
                  <span style={{ fontSize: 36, color: 'var(--app-muted-text)', fontWeight: 700 }}>
                    {String(club.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Upload Button */}
              <div style={{ flex: 1 }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ marginBottom: 8 }}
                >
                  {uploading ? 'Uploading...' : previewUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <div style={{ fontSize: 12, color: 'var(--app-muted-text)' }}>
                  PNG or JPG, recommended 200x200px
                </div>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('');
                      setPreviewUrl(null);
                    }}
                    style={{
                      marginTop: 8,
                      padding: '4px 8px',
                      fontSize: 11,
                      color: '#dc3545',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
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
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--app-text)',
              }}
            >
              Default Match Location
            </label>
            <Input
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g., Johan Cruijff ArenA, Amsterdam"
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 12, color: 'var(--app-muted-text)', marginTop: 4 }}>
              Used to prefill the location field when creating new matches
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: '24px' }}>
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
