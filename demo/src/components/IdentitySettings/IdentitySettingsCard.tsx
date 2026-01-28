import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Input } from '@django-core/design-system';

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
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasLogo = !!current.logoUrl;

  return (
    <Card style={{ padding: 16 }}>
      <div className="flex items-start justify-between" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="text-lg font-semibold" style={{ lineHeight: 1.2 }}>
            {title}
          </div>
          {description ? (
            <div className="text-sm" style={{ color: 'var(--app-muted-text)', marginTop: 4 }}>
              {description}
            </div>
          ) : null}
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
        <div style={{ marginTop: 12 }}>
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
        <div className="text-sm" style={{ fontWeight: 600 }}>
          Logo
        </div>
        {isEditing ? (
          <Input value={logoUrl} onChange={(e) => setLogoUrl((e.target as any).value)} placeholder="https://…" />
        ) : hasLogo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img
              src={current.logoUrl}
              alt="logo"
              style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--app-border)' }}
              onError={(e) => {
                try {
                  (e.currentTarget as any).style.display = 'none';
                } catch {
                  // ignore
                }
              }}
            />
            <a
              href={current.logoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {current.logoUrl}
            </a>
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--app-muted-text)' }}>
            —
          </div>
        )}

        <div className="text-sm" style={{ fontWeight: 600 }}>
          Default match location
        </div>
        {isEditing ? (
          <Input
            value={defaultLocation}
            onChange={(e) => setDefaultLocation((e.target as any).value)}
            placeholder="e.g. Sportpark X, City"
          />
        ) : current.defaultLocation ? (
          <div className="text-sm" style={{ color: 'var(--app-text)' }}>
            {current.defaultLocation}
          </div>
        ) : (
          <div className="text-sm" style={{ color: 'var(--app-muted-text)' }}>
            —
          </div>
        )}
      </div>
    </Card>
  );
}
