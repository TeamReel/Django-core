import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Card, Input } from '@django-core/design-system';
import {
  SEASON_ASSET_SLOTS,
  type SeasonAssets,
  getEffectiveSponsor,
} from '../constants/clubAssets';
import { getApiBaseUrl } from '../utils/apiBase';
import { getCsrfToken } from '../utils/csrf';

interface SeasonAssetsCardProps {
  seasonId: string;
  seasonName: string;
  seasonMetadata: Record<string, unknown>;
  clubAssets?: {
    logo?: { url?: string };
    tenue?: { url?: string };
    sponsor?: { url?: string };
    tenue_with_logo?: { url?: string };
    tenue_full?: { url?: string };
  };
  onAssetsUpdated?: () => void;
}

export default function SeasonAssetsCard({
  seasonId,
  seasonName,
  seasonMetadata,
  clubAssets,
  onAssetsUpdated,
}: SeasonAssetsCardProps) {
  const apiBaseUrl = getApiBaseUrl();

  // Extract current assets from metadata
  const currentAssets = useMemo<SeasonAssets>(() => {
    return (seasonMetadata?.teamreel_assets as SeasonAssets) || {};
  }, [seasonMetadata]);

  // Form state for season sponsor
  const [sponsorUrl, setSponsorUrl] = useState(() => {
    return currentAssets?.sponsor?.url || '';
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check if sponsor has changed
  const hasChanges = useMemo(() => {
    const current = currentAssets?.sponsor?.url || '';
    return sponsorUrl !== current;
  }, [sponsorUrl, currentAssets]);

  // Get effective sponsor (season or club)
  const effectiveSponsor = useMemo(() => {
    return getEffectiveSponsor(clubAssets, currentAssets);
  }, [clubAssets, currentAssets]);

  // Save season sponsor override
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const newAssets: SeasonAssets = { ...currentAssets };
      const url = sponsorUrl?.trim();

      if (url) {
        newAssets.sponsor = {
          url,
          uploaded_at: new Date().toISOString(),
          inherited: false,
        };
      } else {
        // Clear override, will inherit from club
        delete newAssets.sponsor;
      }

      // Update period metadata
      const res = await fetch(
        `${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonId)}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({
            metadata: {
              ...seasonMetadata,
              teamreel_assets: newAssets,
            },
          }),
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || `Failed to save sponsor (${res.status})`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onAssetsUpdated?.();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [apiBaseUrl, seasonId, seasonMetadata, currentAssets, sponsorUrl, onAssetsUpdated]);

  // Clear override (use club sponsor)
  const handleClearOverride = useCallback(() => {
    setSponsorUrl('');
  }, []);

  const hasClubSponsor = Boolean(clubAssets?.sponsor?.url);
  const hasSeasonOverride = Boolean(currentAssets?.sponsor?.url && !currentAssets.sponsor.inherited);

  return (
    <Card>
      <div className="p-4">
        <h3 className="font-medium mb-2">Season Assets</h3>
        <p className="text-sm text-gray-500 mb-4">
          Override sponsor for this season (optional)
        </p>

        {saveError && <Alert variant="error" className="mb-3">{saveError}</Alert>}
        {saveSuccess && <Alert variant="success" className="mb-3">Saved!</Alert>}

        {/* Current effective sponsor */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-1">Effective Sponsor:</div>
          {effectiveSponsor ? (
            <div className="flex items-center gap-3">
              <img
                src={effectiveSponsor}
                alt="Effective sponsor"
                className="h-12 max-w-32 object-contain border rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-xs text-gray-500">
                {hasSeasonOverride ? '(Season override)' : '(From club)'}
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">No sponsor configured</div>
          )}
        </div>

        {/* Season sponsor override input */}
        <div className="space-y-2">
          <label htmlFor="season-sponsor" className="block text-sm font-medium text-gray-700">
            Season Sponsor Override
          </label>
          <Input
            id="season-sponsor"
            type="url"
            placeholder={hasClubSponsor ? 'Leave empty to use club sponsor' : 'https://example.com/sponsor.png'}
            value={sponsorUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSponsorUrl(e.target.value)}
          />
          {sponsorUrl && (
            <div className="mt-2">
              <img
                src={sponsorUrl}
                alt="Season sponsor preview"
                className="h-12 max-w-32 object-contain border rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {hasSeasonOverride && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearOverride}
              disabled={saving}
            >
              Use Club Sponsor
            </Button>
          )}
        </div>

        {/* Info about inheritance */}
        {hasClubSponsor && !hasSeasonOverride && (
          <p className="text-xs text-gray-400 mt-3">
            Using sponsor from club. Add a URL above to override for this season only.
          </p>
        )}
      </div>
    </Card>
  );
}
