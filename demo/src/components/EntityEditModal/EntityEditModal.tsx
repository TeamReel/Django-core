/**
 * EntityEditModal — modal shell with vertical sidebar tabs.
 *
 * Orchestrates:
 *  - useEntityEditData (state, fetch, save, logo upload, change detection)
 *  - EntityGeneralTab (name, slug, description, logo, location, is_active)
 *  - EntityBrandTab   (design tokens CRUD + brand assets preview)
 */
import React from 'react';
import { Button, Alert, Text } from '@django-core/design-system';
import {
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  Palette,
} from 'lucide-react';
import type { EntityEditModalProps } from './entityEditTypes';
import { ENTITY_LABELS } from './entityEditTypes';
import { useEntityEditData } from './useEntityEditData';
import { EntityGeneralTab } from './EntityGeneralTab';
import { EntityBrandTab } from './EntityBrandTab';

export default function EntityEditModal({
  isOpen,
  onClose,
  onSaved,
  entityType,
  entityId,
  entityName,
  organisationId,
  projectId,
  initialEntityData,
  initialBrandProfile,
  canEditGeneral = true,
  canEditBrand = true,
}: EntityEditModalProps) {
  const {
    activeTab,
    setActiveTab,
    entityData,
    setEntityData,
    brandProfile,
    tokens,
    setTokens,
    newTokens,
    setNewTokens,
    deletedTokenIds,
    setDeletedTokenIds,
    loading,
    saving,
    uploading,
    error,
    success,
    hasChanges,
    handleSave,
    handleLogoUpload,
  } = useEntityEditData(isOpen, entityType, entityId, organisationId, projectId, initialEntityData, initialBrandProfile);

  if (!isOpen) return null;

  const EntityIcon = ENTITY_LABELS[entityType].icon;

  // Tabs based on permissions
  const tabs = [
    { key: 'general' as const, label: 'General', icon: Settings, show: true },
    { key: 'brand' as const, label: 'Brand Identity', icon: Palette, show: canEditBrand },
  ].filter((t) => t.show);

  const onSaveClick = () => handleSave(canEditGeneral, canEditBrand, onSaved, onClose);

  return (
    <div
      className="flex-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
      onClick={() => !saving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-surface rounded-12 max-w-800 flex-col"
        style={{ width: '95%', maxHeight: '90vh', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-between border-bottom" style={{ padding: '16px 20px' }}>
          <div className="flex-row gap-12">
            <div
              className="flex-center rounded-8"
              style={{ width: '40px', height: '40px', background: 'var(--app-primary)', color: 'white' }}
            >
              <EntityIcon size={20} />
            </div>
            <div>
              <Text weight="bold" size="lg">Edit {ENTITY_LABELS[entityType].singular}</Text>
              <Text color="secondary" size="sm">{entityName}</Text>
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="bg-transparent border-none cursor-pointer p-8"
            style={{ color: 'var(--app-text-secondary)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main: sidebar + content */}
        <div className="flex-1 overflow-hidden" style={{ display: 'flex' }}>
          {/* Sidebar Tabs */}
          <div
            className="flex-col gap-4"
            style={{
              padding: '16px 12px',
              borderRight: '1px solid var(--app-border)',
              background: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
              minWidth: '160px',
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-row gap-8 border-none rounded-6 cursor-pointer fs-13 text-left w-full"
                  style={{
                    padding: '10px 12px',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    backgroundColor: activeTab === tab.key ? 'var(--app-primary, #3b82f6)' : 'transparent',
                    color: activeTab === tab.key ? 'white' : 'var(--app-text-secondary)',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-20">
            {loading && (
              <div className="p-32 text-center">
                <Loader2 size={32} className="opacity-50" style={{ animation: 'spin 1s linear infinite' }} />
                <Text color="secondary" className="mt-12">Loading...</Text>
              </div>
            )}

            {error && (
              <Alert variant="error" className="mb-16">
                <AlertCircle size={16} />
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" className="mb-16">
                <CheckCircle size={16} />
                {success}
              </Alert>
            )}

            {!loading && activeTab === 'general' && (
              <EntityGeneralTab
                entityType={entityType}
                formData={entityData}
                setFormData={setEntityData}
                disabled={!canEditGeneral}
                orgId={organisationId}
                onLogoUpload={handleLogoUpload}
                uploading={uploading}
              />
            )}

            {!loading && activeTab === 'brand' && (
              <EntityBrandTab
                brandProfile={brandProfile}
                tokens={tokens}
                setTokens={setTokens}
                newTokens={newTokens}
                setNewTokens={setNewTokens}
                deletedTokenIds={deletedTokenIds}
                setDeletedTokenIds={setDeletedTokenIds}
                disabled={!canEditBrand}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-between border-top"
          style={{ padding: '16px 20px', background: 'var(--app-surface-alt, rgba(0,0,0,0.02))' }}
        >
          <div>{hasChanges && <Text size="sm" color="secondary">You have unsaved changes</Text>}</div>
          <div className="flex-row gap-8">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={onSaveClick} disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
