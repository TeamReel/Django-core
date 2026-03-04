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
import styles from './EntityEditModal.module.css';

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
      className={`flex-center ${styles.overlay}`}
      onClick={() => !saving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-surface rounded-12 max-w-800 flex-col ${styles.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex-between border-bottom ${styles.header}`}>
          <div className="flex-row gap-12">
            <div
              className={`flex-center rounded-8 ${styles.headerIcon}`}
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
            className={`bg-transparent border-none cursor-pointer p-8 ${styles.closeButton}`}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main: sidebar + content */}
        <div className={`flex-1 overflow-hidden ${styles.mainLayout}`}>
          {/* Sidebar Tabs */}
          <div
            className={`flex-col gap-4 ${styles.sidebar}`}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-row gap-8 border-none rounded-6 cursor-pointer fs-13 text-left w-full ${styles.tabButton}`}
                  data-active={activeTab === tab.key}
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
                <Loader2 size={32} className={`opacity-50 ${styles.spinner}`} />
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
          className={`flex-between border-top ${styles.footer}`}
        >
          <div>{hasChanges && <Text size="sm" color="secondary">You have unsaved changes</Text>}</div>
          <div className="flex-row gap-8">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={onSaveClick} disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader2 size={14} className={styles.spinner} />
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
      </div>
    </div>
  );
}
