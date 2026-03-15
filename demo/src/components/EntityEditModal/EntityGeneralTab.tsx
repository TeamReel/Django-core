/**
 * EntityGeneralTab — name, slug, description, logo upload, default location, is_active.
 */
import React from 'react';
import { Button, Text } from '@django-core/design-system';
import { Loader2 } from 'lucide-react';
import type { EntityType, EntityData } from './entityEditTypes';
import { ENTITY_LABELS } from './entityEditTypes';
import styles from './EntityGeneralTab.module.css';

interface GeneralTabProps {
  entityType: EntityType;
  formData: Partial<EntityData>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<EntityData>>>;
  disabled?: boolean;
  orgId?: string;
  onLogoUpload?: (file: File) => Promise<string | null>;
  uploading?: boolean;
}

export function EntityGeneralTab({ entityType, formData, setFormData, disabled, orgId, onLogoUpload, uploading }: GeneralTabProps) {
  const label = ENTITY_LABELS[entityType];
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const logoUrl = formData.metadata?.identity?.logo_url || '';
  const defaultLocation = formData.metadata?.identity?.default_location || '';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLogoUpload) {
      const url = await onLogoUpload(file);
      if (url) {
        setFormData((prev) => ({
          ...prev,
          metadata: { ...(prev.metadata || {}), identity: { ...(prev.metadata?.identity || {}), logo_url: url } },
        }));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateIdentity = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...(prev.metadata || {}), identity: { ...(prev.metadata?.identity || {}), [key]: value || null } },
    }));
  };

  return (
    <div className="grid gap-16">
      <label className="grid gap-6">
        <Text size="sm" weight="bold">{label.singular} Name</Text>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          disabled={disabled}
          className={`rounded-6 border text-primary fs-14 ${styles.formInput}`}
          data-disabled={disabled ? '' : undefined}
        />
      </label>

      {entityType === 'organisation' && (
        <label className="grid gap-6">
          <Text size="sm" weight="bold">Slug</Text>
          <input
            type="text"
            value={formData.slug || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
            disabled={disabled}
            className={`rounded-6 border text-primary fs-14 ${styles.formInput} ${styles.monoInput}`}
            data-disabled={disabled ? '' : undefined}
          />
        </label>
      )}

      <label className="grid gap-6">
        <Text size="sm" weight="bold">Description</Text>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          disabled={disabled}
          rows={3}
          className={`rounded-6 border text-primary fs-14 ${styles.formInput} ${styles.resizable}`}
          data-disabled={disabled ? '' : undefined}
        />
      </label>

      {/* Logo Upload — clubs and teams */}
      {(entityType === 'club' || entityType === 'team') && (
        <div className="grid gap-6">
          <Text size="sm" weight="bold">Logo</Text>
          <div className={`gap-16 ${styles.logoRow}`}>
            <div
              className={`flex-center rounded-8 overflow-hidden ${styles.logoPreview}`}
            >
              {uploading ? (
                <Loader2 size={24} className={styles.spinner} />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className={`w-full h-full p-4 ${styles.logoImg}`} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className={`text-muted fw-700 ${styles.logoPlaceholder}`}>{String(formData.name || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <Button variant="outline" size="sm" disabled={disabled || uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              <Text size="sm" color="secondary" className="mt-4">PNG or JPG, recommended 200x200px</Text>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => updateIdentity('logo_url', '')}
                  className={`mt-4 fs-11 border-none cursor-pointer bg-transparent ${styles.removeBtn}`}
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Default Match Location — clubs and teams */}
      {(entityType === 'club' || entityType === 'team') && (
        <label className="grid gap-6">
          <Text size="sm" weight="bold">Default Match Location</Text>
          <input
            type="text"
            value={defaultLocation}
            onChange={(e) => updateIdentity('default_location', e.target.value)}
            disabled={disabled}
            placeholder="e.g., Johan Cruijff ArenA, Amsterdam"
            className={`rounded-6 border text-primary fs-14 ${styles.formInput}`}
            data-disabled={disabled ? '' : undefined}
          />
          <Text size="sm" color="secondary">Used to prefill the location when creating new matches</Text>
        </label>
      )}

      <label className={`flex-row gap-12 ${styles.checkboxLabel}`} data-disabled={disabled ? '' : undefined}>
        <input
          type="checkbox"
          checked={formData.is_active ?? true}
          onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
          disabled={disabled}
          className={styles.checkbox}
        />
        <div>
          <Text weight="bold">Active</Text>
          <Text size="sm" color="secondary">Inactive {entityType}s are hidden from most views</Text>
        </div>
      </label>
    </div>
  );
}
