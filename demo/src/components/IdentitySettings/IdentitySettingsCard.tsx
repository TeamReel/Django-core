import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Input } from '@django-core/design-system';
import styles from './IdentitySettingsCard.module.css';
import { logger } from '@/utils/logger';

export type IdentitySettingsValues = {
  logoUrl: string;
  defaultLocation: string;
};

export type IdentitySettingsCardProps = {
  title: string;
  description?: string;
  values: IdentitySettingsValues;
  canEdit?: boolean;
  onSave?: (next: IdentitySettingsValues) => Promise<void>;
};

export default function IdentitySettingsCard({
  title,
  description,
  values,
  canEdit = false,
  onSave,
}: IdentitySettingsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = useMemo(() => {
    return {
      logoUrl: String(values?.logoUrl || '').trim(),
      defaultLocation: String(values?.defaultLocation || '').trim(),
    };
  }, [values]);

  useEffect(() => {
    if (!isEditing) return;
    setLogoUrl(current.logoUrl);
    setDefaultLocation(current.defaultLocation);
  }, [isEditing, current.logoUrl, current.defaultLocation]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        logoUrl: String(logoUrl || '').trim(),
        defaultLocation: String(defaultLocation || '').trim(),
      });
      setIsEditing(false);
    } catch (e) {
      logger.error('Failed to save identity settings', e);
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasLogo = !!current.logoUrl;

  return (
    <Card className="p-16">
      <div className="flex items-start justify-between gap-12">
        <div className="min-w-0">
          <div className={`text-lg font-semibold ${styles.titleLine}`}>
            {title}
          </div>
          {description ? (
            <div className="text-sm text-muted mt-4">
              {description}
            </div>
          ) : null}
        </div>

        {canEdit && (
          <div className={`gap-8 flex-wrap ${styles.editButtons}`}>
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-12">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className={`mt-12 grid ${styles.settingsGrid}`}>
        <div className="text-sm fw-600">
          Logo
        </div>
        {isEditing ? (
          <Input value={logoUrl} onChange={(e) => setLogoUrl((e.target as HTMLInputElement).value)} placeholder="https://…" />
        ) : hasLogo ? (
          <div className="flex-row gap-10 min-w-0">
            <img
              src={current.logoUrl}
              alt="logo"
              className={`rounded-6 border ${styles.logoImage}`}
              onError={(e) => {
                try {
                  e.currentTarget.style.display = 'none';
                } catch {
                  // ignore
                }
              }}
            />
            <a
              href={current.logoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline truncate"
            >
              {current.logoUrl}
            </a>
          </div>
        ) : (
          <div className="text-sm text-muted">
            —
          </div>
        )}

        <div className="text-sm fw-600">
          Default match location
        </div>
        {isEditing ? (
          <Input
            value={defaultLocation}
            onChange={(e) => setDefaultLocation((e.target as HTMLInputElement).value)}
            placeholder="e.g. Sportpark X, City"
          />
        ) : current.defaultLocation ? (
          <div className="text-sm text-primary">
            {current.defaultLocation}
          </div>
        ) : (
          <div className="text-sm text-muted">
            —
          </div>
        )}
      </div>
    </Card>
  );
}
