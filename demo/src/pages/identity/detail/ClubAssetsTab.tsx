import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Card, Input } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import SlotIcon from '../../../components/SlotIcon';
import {
  CLUB_ASSET_SLOTS,
  type ClubAssets,
  type ClubAssetSlot,
  canGenerateClubTenue,
} from '../../../constants/clubAssets';
import { projectsApi } from '../../../api';
import type { ProjectDetail } from '../../../types/api';
import { getApiBaseUrl } from '../../../utils/apiBase';
import styles from './ClubAssetsTab.module.css';

interface ClubAssetsTabProps {
  clubId: string;
  clubName: string;
  clubMetadata: Record<string, unknown>;
  onAssetsUpdated?: () => void;
}

export default function ClubAssetsTab({
  clubId,
  clubName,
  clubMetadata,
  onAssetsUpdated,
}: ClubAssetsTabProps) {
  const apiBaseUrl = getApiBaseUrl();

  // Extract current assets from metadata
  const currentAssets = useMemo<ClubAssets>(() => {
    return (clubMetadata?.teamreel_assets as ClubAssets) || {};
  }, [clubMetadata]);

  // Form state for each input slot
  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const inputSlots = CLUB_ASSET_SLOTS.filter((s): s is ClubAssetSlot & { isInput: true } => s.isInput);
    inputSlots.forEach((slot) => {
      initial[slot.id] = (currentAssets as Record<string, { url?: string }>)?.[slot.id]?.url || '';
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Check if assets have changed
  const hasChanges = useMemo(() => {
    const inputSlots = CLUB_ASSET_SLOTS.filter((s): s is ClubAssetSlot & { isInput: true } => s.isInput);
    return inputSlots.some((slot) => {
      const current = (currentAssets as Record<string, { url?: string }>)?.[slot.id]?.url || '';
      return form[slot.id] !== current;
    });
  }, [form, currentAssets]);

  // Save assets to club metadata
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Build new assets object preserving generated assets
      const newAssets: ClubAssets = { ...currentAssets };
      const inputSlots = CLUB_ASSET_SLOTS.filter((s): s is ClubAssetSlot & { isInput: true } => s.isInput);

      inputSlots.forEach((slot) => {
        const url = form[slot.id]?.trim();
        if (url) {
          (newAssets as Record<string, { url: string; uploaded_at: string }>)[slot.id] = {
            url,
            uploaded_at: new Date().toISOString(),
          };
        } else {
          delete (newAssets as Record<string, unknown>)[slot.id];
        }
      });

      // Update club metadata
      const updated = await projectsApi.update(clubId, {
        metadata: {
          ...clubMetadata,
          teamreel_assets: newAssets,
        },
      } as Partial<ProjectDetail>);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onAssetsUpdated?.();
    } catch (e) {
      logger.error('Failed to save', e);
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [apiBaseUrl, clubId, clubMetadata, currentAssets, form, onAssetsUpdated]);

  // Generate tenue combinations
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);

    try {
      // For now, just show a placeholder message
      // In the future, this will call a content generation API
      alert(
        'Tenue generation will be implemented with the content generation backend.\n\n' +
          'This will combine:\n' +
          '• Tenue template\n' +
          '• Club logo\n' +
          '• Sponsor logo (if available)\n\n' +
          'To generate optimized kit images.'
      );
    } catch (e) {
      logger.error('Generation failed', e);
      setGenerateError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, []);

  const inputSlots = CLUB_ASSET_SLOTS.filter((s): s is ClubAssetSlot & { isInput: true } => s.isInput);
  const generatedSlots = CLUB_ASSET_SLOTS.filter((s): s is ClubAssetSlot & { isInput: false } => !s.isInput);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{clubName} Assets</h2>
          <p className="text-sm text-gray-500">
            Upload club branding assets used to generate player images
          </p>
        </div>
      </div>

      {saveError && <Alert variant="error">{saveError}</Alert>}
      {saveSuccess && <Alert variant="success">Assets saved successfully!</Alert>}
      {generateError && <Alert variant="error">{generateError}</Alert>}

      {/* Input Assets */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-medium">Upload Assets</h3>
          <p className="text-sm text-gray-500">
            Provide URLs to your club branding images
          </p>
        </div>
        <div className="p-4 space-y-4">
          {inputSlots.map((slot) => (
            <div key={slot.id} className="space-y-1">
              <label htmlFor={`asset-${slot.id}`} className="block text-sm font-medium text-gray-700">
                <SlotIcon name={slot.icon} size={14} className={styles.inlineIcon} /> {slot.label}
                {slot.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Input
                id={`asset-${slot.id}`}
                type="url"
                placeholder={`https://example.com/${slot.id}.png`}
                value={form[slot.id] || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, [slot.id]: e.target.value }))
                }
              />
              <p className="text-xs text-gray-500">{slot.description}</p>

              {/* Preview if URL is set */}
              {form[slot.id] && (
                <div className="mt-2">
                  <img
                    src={form[slot.id]}
                    alt={slot.label}
                    className="max-h-32 rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? 'Saving...' : 'Save Assets'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated Assets */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-medium">Generated Assets</h3>
          <p className="text-sm text-gray-500">
            Automatically generated from your uploaded assets
          </p>
        </div>
        <div className="p-4 space-y-4">
          {generatedSlots.map((slot) => {
            const asset = (currentAssets as Record<string, { url?: string; generated_at?: string }>)?.[slot.id];
            const deps = slot.dependsOn || [];
            const missingDeps = deps.filter(
              (d: string) => !(currentAssets as Record<string, { url?: string }>)?.[d]?.url
            );

            return (
              <div key={slot.id} className="flex items-start gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                  {asset?.url ? (
                    <img
                      src={asset.url}
                      alt={slot.label}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-2xl opacity-30"><SlotIcon name={slot.icon} size={24} /></span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    <SlotIcon name={slot.icon} size={14} className={styles.inlineIcon} /> {slot.label}
                  </div>
                  <p className="text-sm text-gray-500">{slot.description}</p>
                  {missingDeps.length > 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      Missing: {missingDeps.join(', ')}
                    </p>
                  )}
                  {asset?.generated_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Generated: {new Date(asset.generated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={handleGenerate}
              disabled={generating || !canGenerateClubTenue(currentAssets)}
            >
              {generating ? 'Generating...' : 'Generate Tenue Images'}
            </Button>
            {!canGenerateClubTenue(currentAssets) && (
              <p className="text-sm text-gray-500 self-center">
                Upload Logo and Tenue first
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Usage Info */}
      <Card>
        <div className="p-4">
          <h3 className="font-medium mb-2">How Assets Are Used</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>1. Club Level:</strong> Upload your logo, kit template,
              and sponsor logo here.
            </p>
            <p>
              <strong>2. Season Level:</strong> Optionally override the sponsor
              for specific seasons.
            </p>
            <p>
              <strong>3. Member Level:</strong> Each player&apos;s profile photo
              is combined with the season&apos;s effective tenue to generate
              &quot;In Tenue&quot; images.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
