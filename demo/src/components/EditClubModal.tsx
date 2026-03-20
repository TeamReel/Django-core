import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Alert } from '@django-core/design-system';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { getAssetUrl } from '@/hooks/brandProfileConstants';
import styles from './EditClubModal.module.css';

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
      const fileData = await api.upload<{ id: string; storage_path?: string }>(
        `/files/?path_prefix=${encodeURIComponent(pathPrefix)}`,
        file,
        { is_public: 'true' },
      );

      const fileId = fileData?.id;
      const storagePath = fileData?.storage_path;

      if (!fileId) {
        throw new Error('No file ID returned from upload');
      }

      // Construct the S3 URL
      const s3Url = getAssetUrl(storagePath)!;

      setLogoUrl(s3Url);
      setPreviewUrl(s3Url);
    } catch (e) {
      logger.error('Upload failed', e);
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
      const updated = await api.patch<Club>(`/projects/${encodeURIComponent(String(club.id))}/`, {
        metadata: {
          ...(club.metadata || {}),
          identity: {
            ...((club.metadata || {})?.identity || {}),
            logo_url: logoUrl.trim() || null,
            default_location: defaultLocation.trim() || null,
          },
        },
      });

      onSave?.({ ...club, ...updated });
      onClose();
    } catch (e) {
      logger.error('Save failed', e);
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`flex-center ${styles.overlay}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-surface p-24 rounded-12 overflow-auto text-primary border ${styles.modal}`}
      >
        <h2 className={`fs-20 fw-600 ${styles.heading}`}>
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
            <div className={`gap-16 ${styles.logoSection}`}>
              {/* Logo Preview */}
              <div
                className={`flex-center rounded-12 overflow-hidden ${styles.logoPreview}`}
              >
                {uploading ? (
                  <span className="text-muted fs-12">Laden...</span>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className={`w-full h-full p-8 ${styles.logoImg}`}
                    onError={() => setPreviewUrl(null)}
                  />
                ) : (
                  <span className={`text-muted fw-700 ${styles.placeholderText}`}>
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
                    className={`mt-8 py-4 px-8 fs-11 bg-transparent border-none cursor-pointer ${styles.removeLogoBtn}`}
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
        <div className={`gap-12 mt-24 ${styles.actions}`}>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
