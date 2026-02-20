import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { canEditProject } from '../../utils/permissions';
import { ACTIVE_CONTEXT_CHANGED_EVENT, getActiveContext, setActiveContext } from '../../utils/activeContext';
import { MEDIA_SLOTS, MediaSlotId, MemberMediaForm } from '../../constants/mediaSlots';
import {
  type AssetVariantValue,
  normalizeVariantValue,
  getBestUrl,
  isLineupReady,
  isProcessing,
  getProcessingStateLabel,
  ASSET_PROCESSING_SPECS,
} from '../../constants/assetProcessingSpecs';
import { getApiBaseUrl } from '../../utils/apiBase';
import { AssetsTab } from '../../components/AssetsTab';
import { AssetGenerationModal, type SavedAssetInfo } from '../../components/AssetGenerationModal';
import { useBrandProfile, getAssetUrl, resolvePresignedUrls, KIT_ROLES } from '../../hooks/useBrandProfile';
import { useGenerationJobs } from '../../hooks/useGenerationJobs';
import MobileTabBar from '../../components/MobileTabBar';
import { WorkflowPanel } from '../../components/Workflows';

type Project = {
  id: string;
  slug?: string;
  name: string;
  organisation?: any;
};

type Organisation = {
  id: string;
  slug?: string;
  name: string;
  user_role?: string;
};

type Period = {
  id: string;
  name: string;
  type?: string;
  period_type?: string;
  parent_period?: any;
  parent_period_id?: string | null;
};

function unwrap<T = any>(payload: any): T {
  return (payload?.data as T) ?? (payload as T);
}

function isSeasonPeriod(p: any): boolean {
  if (!p) return false;
  const explicit = String(p.type || p.period_type || '').toLowerCase();
  if (explicit === 'season') return true;
  const hasParent = Boolean(p.parent_period || p.parent_period_id);
  return !hasParent;
}

const getCsrfToken = (): string =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1] || '';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getUserDisplayName(membership: any): string {
  const u = membership?.user || {};
  const name =
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Member';
  return name;
}

// MEDIA_SLOTS, MediaSlotId, MemberMediaForm imported from ../../constants/mediaSlots

/**
 * Create empty media form - uses shared MEDIA_SLOTS
 */
function createEmptyMediaForm(): MemberMediaForm {
  return MEDIA_SLOTS.reduce((acc, slot) => {
    acc[slot.id] = { url: '', caption: '' };
    return acc;
  }, {} as MemberMediaForm);
}

/**
 * Read assets from membership with legacy format migration.
 * This is specific to member detail page as it handles backwards compatibility.
 */
/** Per-variant asset URLs stored in metadata (supports both old string and new object format) */
type AssetVariantRaw = string | AssetVariantValue;
type AssetVariants = Record<string, AssetVariantRaw>; // e.g. { home: "s3://..." } or { home: { raw, processed, ... } }
type AssetVariantsMap = {
  // Per-kit-type images
  fullbody: AssetVariants;  // { home: "s3://...", away: "...", third: "...", keeper: "..." }
  closeup: AssetVariants;   // same pattern
  // Per-style-variant videos
  intro: AssetVariants;
  celebration: AssetVariants;
};

// Keep old name as alias for backwards compatibility within file
type VideoVariantsMap = AssetVariantsMap;

function createEmptyVideoVariants(): AssetVariantsMap {
  return { fullbody: {}, closeup: {}, intro: {}, celebration: {} };
}

function readAssetsFromMembership(membership: any): MemberMediaForm {
  const meta = (membership as any)?.metadata || {};
  const tr = (meta as any)?.teamreel_assets || (meta as any)?.teamreelAssets || {};
  const media = tr?.media || {};

  // Also read legacy format for backwards compatibility
  const legacyKit = tr?.kit || {};
  const legacyOld = tr?.old || {};

  const form = createEmptyMediaForm();

  // Read new format first
  for (const slot of MEDIA_SLOTS) {
    const slotData = media[slot.id] || {};
    form[slot.id] = {
      url: String(slotData?.url || '').trim(),
      caption: String(slotData?.caption || '').trim(),
    };
  }

  // Migrate legacy format if new format is empty
  if (!form.profile.url && legacyKit?.profile_photo_url) {
    form.profile.url = String(legacyKit.profile_photo_url).trim();
  }
  if (!form.kit.url && legacyKit?.full_body_url) {
    form.kit.url = String(legacyKit.full_body_url).trim();
  }
  if (!form.intro.caption && legacyKit?.intro_text) {
    form.intro.caption = String(legacyKit.intro_text).trim();
  }
  if (!form.celebration.url && legacyKit?.goal_celebration_url) {
    form.celebration.url = String(legacyKit.goal_celebration_url).trim();
  }
  if (!form.legacy_photo.url && legacyOld?.profile_photo_url) {
    form.legacy_photo.url = String(legacyOld.profile_photo_url).trim();
  }

  return form;
}

function readVideoVariantsFromMembership(membership: any): AssetVariantsMap {
  const meta = (membership as any)?.metadata || {};
  const tr = meta?.teamreel_assets || meta?.teamreelAssets || {};
  const videos = tr?.videos || {};
  const images = tr?.images || {};

  const safeObj = (obj: any): Record<string, AssetVariantRaw> =>
    (obj && typeof obj === 'object' ? { ...obj } : {});

  // Migrate old intro/celebration keys (flat style variant → composite home_variant)
  const migrateVideoKeys = (raw: Record<string, AssetVariantRaw>): Record<string, AssetVariantRaw> => {
    const migrated: Record<string, AssetVariantRaw> = {};
    const styleVariants = ['arms_crossed', 'hand_up', 'thumbs_up', 'arms_wide', 'fist_pump', 'point_to_sky', 'slide'];
    for (const [key, val] of Object.entries(raw)) {
      if (!val) continue;
      // Already composite key (e.g. home_arms_crossed)? Keep as-is
      if (key.includes('_') && !styleVariants.includes(key)) {
        migrated[key] = val;
      } else if (styleVariants.includes(key)) {
        // Old format: bare style variant → migrate to home_ prefix
        migrated[`home_${key}`] = val;
      } else {
        migrated[key] = val;
      }
    }
    return migrated;
  };

  const result: AssetVariantsMap = {
    fullbody: safeObj(images?.fullbody),
    closeup: safeObj(images?.closeup),
    intro: migrateVideoKeys(safeObj(videos?.intro)),
    celebration: migrateVideoKeys(safeObj(videos?.celebration)),
  };

  // Migrate: if form.kit has a URL but fullbody.home is empty, seed it
  const media = tr?.media || {};
  if (!result.fullbody.home && media?.kit?.url) {
    result.fullbody.home = String(media.kit.url).trim();
  }
  if (!result.closeup.home && media?.closeup?.url) {
    result.closeup.home = String(media.closeup.url).trim();
  }

  return result;
}

function mergeAssetsIntoMetadata(existingMetadata: any, form: MemberMediaForm, videoVariants?: VideoVariantsMap): any {
  const meta = existingMetadata && typeof existingMetadata === 'object' ? { ...existingMetadata } : {};
  const existingTeamReel =
    meta.teamreel_assets && typeof meta.teamreel_assets === 'object'
      ? meta.teamreel_assets
      : meta.teamreelAssets && typeof meta.teamreelAssets === 'object'
        ? meta.teamreelAssets
        : {};

  // Build new media object
  const media: Record<string, { url: string; caption: string }> = {};
  for (const slot of MEDIA_SLOTS) {
    media[slot.id] = {
      url: form[slot.id]?.url || '',
      caption: form[slot.id]?.caption || '',
    };
  }

  // Keep legacy format for backwards compatibility
  const next: Record<string, any> = {
    ...existingTeamReel,
    media,
    // Legacy format (will be phased out)
    kit: {
      profile_photo_url: form.profile?.url || '',
      full_body_url: form.kit?.url || '',
      intro_text: form.intro?.caption || '',
      goal_celebration_url: form.celebration?.url || '',
    },
    old: {
      profile_photo_url: form.legacy_photo?.url || '',
      full_body_url: '',
    },
  };

  // Persist per-kit-type image URLs
  if (videoVariants) {
    next.images = {
      fullbody: videoVariants.fullbody || {},
      closeup: videoVariants.closeup || {},
    };
    next.videos = {
      intro: videoVariants.intro || {},
      celebration: videoVariants.celebration || {},
    };
  } else {
    if (existingTeamReel.images) next.images = existingTeamReel.images;
    if (existingTeamReel.videos) next.videos = existingTeamReel.videos;
  }

  meta.teamreel_assets = next;
  return meta;
}

/**
 * Identity Tab Content Component - shows profile photo with edit functionality
 */

/**
 * Extract the best display URL from a variant value (string or object).
 * Prefers processed → raw → null.
 */
function getVariantDisplayUrl(val: AssetVariantRaw | null | undefined): string | null {
  return getBestUrl(val);
}

/**
 * Extract the raw URL string from an AssetVariantRaw for backwards compat.
 */
function getVariantRawUrl(val: AssetVariantRaw | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val || null;
  return val.raw || val.processed || null;
}

/**
 * Call the backend process-asset endpoint.
 */
async function triggerAssetProcessing(
  apiBaseUrl: string,
  membershipId: string,
  assetType: string,
  kitType: string,
  variantId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const csrfToken = getCsrfToken();
    const res = await fetch(`${apiBaseUrl}/api/v1/video/jobs/process-asset/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({
        membership_id: membershipId,
        asset_type: assetType,
        kit_type: kitType,
        variant_id: variantId || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return { ok: false, error: err?.error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

async function cancelAssetProcessing(
  apiBaseUrl: string,
  membershipId: string,
  assetType: string,
  kitType: string,
  variantId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const csrfToken = getCsrfToken();
    const res = await fetch(`${apiBaseUrl}/api/v1/video/jobs/cancel-asset-processing/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({
        membership_id: membershipId,
        asset_type: assetType,
        kit_type: kitType,
        variant_id: variantId || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return { ok: false, error: err?.error || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Poll membership metadata until a variant's processing_state resolves to 'processed' or 'failed'.
 * Calls setMembership to trigger the useEffect that re-derives videoVariants.
 */
async function pollProcessingResult(
  apiBaseUrl: string,
  projectId: string,
  membershipId: string,
  assetType: string,
  kitType: string,
  variantId: string | null | undefined,
  setMembershipFn: (m: any) => void,
  abortSignal?: AbortSignal,
): Promise<void> {
  const POLL_INTERVAL = 3000;
  const isImage = assetType === 'fullbody' || assetType === 'closeup';
  // Videos need much longer for per-frame bg removal (~75 frames × ~1.5s = ~2min)
  const MAX_POLLS = isImage ? 80 : 200; // images ~4min, videos ~10min
  const compositeKey = variantId ? `${kitType}_${variantId}` : kitType;

  for (let i = 0; i < MAX_POLLS; i++) {
    if (abortSignal?.aborted) return;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    if (abortSignal?.aborted) return;

    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
        { credentials: 'include' }
      );
      if (!res.ok) continue;
      const json = await res.json();
      const mData = json?.data || json;
      const tr = mData?.metadata?.teamreel_assets || mData?.metadata?.teamreelAssets || {};

      let checkVal: any = null;
      if (isImage) {
        checkVal = ((tr.images || {})[assetType] || {})[kitType];
      } else {
        checkVal = ((tr.videos || {})[assetType] || {})[compositeKey];
      }

      if (checkVal && typeof checkVal === 'object') {
        const state = checkVal.processing_state;
        if (state === 'processed' || state === 'failed' || state === 'cancelled') {
          // Update full membership so useEffect re-derives videoVariants
          setMembershipFn(mData);
          return;
        }
      }
    } catch {
      // Network error — keep trying
    }
  }
}

/**
 * Small badge component for processing state.
 */
function ProcessingBadge({ value }: { value: AssetVariantRaw | null | undefined }) {
  const normalized = normalizeVariantValue(value as any);
  if (!normalized) return null;

  const { label, color, icon } = getProcessingStateLabel(normalized.processing_state);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: '4px',
      background: `${color}22`,
      color: color,
      border: `1px solid ${color}44`,
    }}>
      {icon} {label}
    </span>
  );
}

function IdentityTabContent({
  membership,
  project,
  apiBaseUrl,
  onMembershipUpdate,
}: {
  membership: any;
  project: Project | null;
  apiBaseUrl: string;
  onMembershipUpdate: (updated: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPosition, setEditPosition] = useState('');
  const [editJerseyNumber, setEditJerseyNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settingAsProfilePhoto, setSettingAsProfilePhoto] = useState(false);

  // Get the profile media slot URL if available
  const profileMediaUrl = membership?.metadata?.teamreel_assets?.media?.profile?.url ||
    membership?.metadata?.teamreel_assets?.kit?.profile_photo_url || '';

  useEffect(() => {
    if (isEditing && membership) {
      setEditPosition(membership?.metadata?.position || membership?.position || '');
      setEditJerseyNumber(membership?.metadata?.jersey_number || membership?.jersey_number || '');
    }
  }, [isEditing, membership]);

  const handleSave = async () => {
    if (!project?.id || !membership?.id) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';

      // Merge position and jersey number into metadata
      const existingMeta = membership?.metadata || {};
      const newMeta = {
        ...existingMeta,
        position: editPosition.trim() || null,
        jersey_number: editJerseyNumber.trim() || null,
      };

      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project.id}/members/${membership.id}/`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({ metadata: newMeta }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to save: ${res.status}`);
      }

      const json = await res.json();
      const updated = json?.data || json;
      onMembershipUpdate(updated);
      setIsEditing(false);
      setSuccess('Identity updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleUseAsProfilePhoto = async () => {
    if (!profileMediaUrl) return;

    // Extract the relative path from the S3 URL
    let path = profileMediaUrl;
    const s3Prefix = 'https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/';
    if (path.startsWith(s3Prefix)) {
      path = path.replace(s3Prefix, '');
    }

    setSettingAsProfilePhoto(true);
    setError(null);
    setSuccess(null);

    try {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';

      const res = await fetch(`${apiBaseUrl}/api/v1/auth/avatar/set-path/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ path }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || `Failed: ${res.status}`);
      }

      setSuccess('Profile photo updated! Refresh to see changes.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set profile photo');
    } finally {
      setSettingAsProfilePhoto(false);
    }
  };

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🪪</span>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>Identity</div>
          </div>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
          Profile photo and personal information for this member.
        </div>

        {error && (
          <Alert variant="error" style={{ marginTop: '12px' }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" style={{ marginTop: '12px' }}>
            {success}
          </Alert>
        )}

        <div style={{ marginTop: '20px' }}>
          {/* Profile Photo Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Profile Photo</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{
                width: '160px',
                height: '160px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: 'var(--app-surface-secondary)',
                border: '2px solid var(--app-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {membership?.user?.avatar_url ? (
                  <img
                    src={membership.user.avatar_url}
                    alt={getUserDisplayName(membership)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '48px', opacity: 0.3 }}>👤</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                {membership?.user?.avatar_url ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#28a745', fontWeight: 600 }}>✓ Profile photo set</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--app-muted-text)', fontStyle: 'italic' }}>
                    No profile photo set
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Media Profile Photo - If different from user avatar */}
          {profileMediaUrl && profileMediaUrl !== membership?.user?.avatar_url && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--app-surface-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Media Profile Photo</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--app-surface)',
                  border: '2px solid var(--app-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src={profileMediaUrl}
                    alt="Media profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', opacity: 0.7 }}>
                    Photo from media slot (e.g., SoccerWiki import)
                  </div>
                  <div style={{
                    padding: '8px 12px',
                    background: 'var(--app-surface)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    marginBottom: '12px',
                  }}>
                    {profileMediaUrl}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleUseAsProfilePhoto}
                    disabled={settingAsProfilePhoto}
                  >
                    {settingAsProfilePhoto ? 'Setting...' : '→ Use as User Profile Photo'}
                  </Button>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px' }}>
                    This will set your user account avatar to this photo.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Information Section */}
          <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>User Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Name</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{getUserDisplayName(membership)}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Email</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{membership?.user?.email || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>User ID</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', opacity: 0.8 }}>{membership?.user?.id || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Membership ID</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', opacity: 0.8 }}>{membership?.id || '—'}</div>
              </div>
            </div>
          </div>

          {/* Role/Position Section */}
          <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: '20px', marginTop: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Role & Position</div>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Position</div>
                  <Input
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    placeholder="e.g., Forward, Midfielder, Goalkeeper"
                  />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Jersey Number</div>
                  <Input
                    value={editJerseyNumber}
                    onChange={(e) => setEditJerseyNumber(e.target.value)}
                    placeholder="e.g., 10"
                    style={{ maxWidth: '100px' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Role</div>
                  <Badge variant="default">{membership?.role || 'member'}</Badge>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Position</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {membership?.metadata?.position || (membership as any)?.position || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7, marginBottom: '4px' }}>Jersey Number</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {membership?.metadata?.jersey_number || (membership as any)?.jersey_number || '—'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ProjectSeasonMemberDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const { context } = useContextSwitcher();

  const apiBaseUrl = getApiBaseUrl();

  const orgSlugOrId = String((params as any).orgId || '').trim();
  const clubSlugOrId = String((params as any).clubId || '').trim();
  const projectSlugOrId = String((params as any).projectId || '').trim();
  const seasonKeyOrId = String((params as any).seasonId || '').trim();
  const membershipId = String((params as any).competitionId || '').trim();

  const isOrgRoutes = location.pathname.startsWith('/organisations/');
  const isTeamRoute = Boolean(clubSlugOrId);

  const seasonsBasePath = useMemo(() => {
    if (isOrgRoutes) {
      if (isTeamRoute) {
        return `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${projectSlugOrId}/seasons`;
      }
      return `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;
    }

    if (isTeamRoute) {
      return `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}`;
    }

    return `/organisations/${orgSlugOrId}/projects/${projectSlugOrId}/seasons`;
  }, [clubSlugOrId, isOrgRoutes, isTeamRoute, orgSlugOrId, projectSlugOrId]);

  const activeTab = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = String(sp.get('tab') || '').trim();
    if (!raw) return 'overview';
    return raw;
  }, [location.search]);

  const navigateToTab = (tabId: string) => {
    const sp = new URLSearchParams(location.search);
    sp.set('tab', tabId);
    const next = sp.toString();
    navigate(next ? `${location.pathname}?${next}` : location.pathname);
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [org, setOrg] = useState<Organisation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [club, setClub] = useState<Project | null>(null);

  const [season, setSeason] = useState<Period | null>(null);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>('');

  const [membership, setMembership] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const ctx = await getActiveContext();
        if (!cancelled) setActiveContextState(ctx);
      } catch {
        if (!cancelled) setActiveContextState(null);
      }
    };

    const onChanged = () => {
      void load();
    };

    void load();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    };
  }, []);

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin =
    Boolean((user as any)?.is_superuser) ||
    Boolean((user as any)?.is_staff) ||
    userRole === 'superadmin' ||
    userRole === 'super admin';

  const orgForPermissions = useMemo(() => {
    const contextOrg = context?.organisation as any;
    const orgIdMatches = (candidate: any) => {
      if (!candidate) return false;
      const cid = String(candidate.id || '').trim();
      const cslug = String(candidate.slug || '').trim();
      const oid = String((org as any)?.id || '').trim();
      const oslug = String((org as any)?.slug || '').trim();
      const route = String(orgSlugOrId || '').trim();
      return (
        (cid && oid && cid === oid) ||
        (cslug && oslug && cslug === oslug) ||
        (cid && route && cid === route) ||
        (cslug && route && cslug === route)
      );
    };

    if (orgIdMatches(contextOrg) && contextOrg?.user_role) return contextOrg;
    const projectOrg = (project as any)?.organisation;
    if (projectOrg?.user_role) return projectOrg;
    if ((org as any)?.user_role) return org;
    if (orgIdMatches(contextOrg)) return contextOrg;
    return projectOrg || org || contextOrg || null;
  }, [context?.organisation, org, orgSlugOrId, project]);

  const permissionContext = useMemo(
    () => ({ currentOrganisation: orgForPermissions as any, isSuperAdmin }),
    [orgForPermissions, isSuperAdmin]
  );

  const userCanEditProject = canEditProject(permissionContext);

  const [form, setForm] = useState<MemberMediaForm>(() => createEmptyMediaForm());
  const [videoVariants, setVideoVariants] = useState<VideoVariantsMap>(() => createEmptyVideoVariants());

  // ── Presigned URL cache: maps raw S3 storage paths → presigned URLs ──
  const [presignedCache, setPresignedCache] = useState<Record<string, string>>({});

  // Processing polling: ensure we never start multiple concurrent pollers for the same asset.
  // Without this, navigating away/back (unmount/remount) or re-clicking can leave old poll loops running,
  // causing hundreds of repeated GET requests.
  const activePollsRef = useRef<Record<string, AbortController>>({});

  const startProcessingPoll = useCallback((assetType: string, kitType: string, variantId?: string | null) => {
    if (!project?.id || !membershipId) return;
    const key = `${assetType}:${kitType}:${variantId || ''}`;

    const existing = activePollsRef.current[key];
    if (existing) existing.abort();

    const controller = new AbortController();
    activePollsRef.current[key] = controller;

    void pollProcessingResult(
      apiBaseUrl,
      project.id,
      membershipId,
      assetType,
      kitType,
      variantId || null,
      setMembership,
      controller.signal,
    ).finally(() => {
      if (activePollsRef.current[key] === controller) {
        delete activePollsRef.current[key];
      }
    });
  }, [apiBaseUrl, membershipId, project?.id]);

  useEffect(() => {
    return () => {
      // Abort any in-flight pollers when this page unmounts.
      for (const controller of Object.values(activePollsRef.current)) {
        controller.abort();
      }
      activePollsRef.current = {};
    };
  }, []);

  // Profile Photo Upload State
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const handleProfilePhotoUpload = async (file: File) => {
    const userId = membership?.user?.id || (membership as any)?.user_id;
    if (!userId) { alert('Geen user ID gevonden.'); return; }
    setProfileUploading(true);
    setProfilePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}/avatar/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': csrfToken },
        body: fd,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Upload mislukt: ${res.status} ${errBody.slice(0, 200)}`);
      }
      // Refresh membership data to pick up new avatar_url
      const memberRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`,
        { credentials: 'include' }
      );
      if (memberRes.ok) {
        const json = await memberRes.json();
        setMembership(json?.data || json);
      }
    } catch (err) {
      console.error('Profile photo upload error:', err);
      alert(err instanceof Error ? err.message : 'Upload mislukt');
    } finally {
      setProfileUploading(false);
    }
  };

  // Closeup from fullbody crop
  const [croppingCloseup, setCroppingCloseup] = useState(false);

  const cropCloseupFromFullbody = async (fullbodyUrl: string, kitType: string) => {
    setCroppingCloseup(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Kon fullbody afbeelding niet laden'));
        img.src = fullbodyUrl;
      });

      // Crop top 45% of the image (head + shoulders)
      const cropRatio = 0.45;
      const cropH = Math.round(img.naturalHeight * cropRatio);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, img.naturalWidth, cropH, 0, 0, img.naturalWidth, cropH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas toBlob mislukt')), 'image/png');
      });

      // Upload as brand asset via the generic file upload
      const fd = new FormData();
      fd.append('file', blob, `closeup_crop_${kitType}.png`);
      const csrfToken = getCsrfToken();

      // Save the cropped closeup URL in membership metadata
      const croppedUrl = URL.createObjectURL(blob);

      // Store it via the same metadata pathway as AI results
      const category = 'closeup';
      const effectiveKitType = kitType || 'home';

      const newVariants: AssetVariantsMap = {
        ...videoVariants,
        [category]: {
          ...videoVariants[category],
          [effectiveKitType]: croppedUrl,
        },
      };
      setVideoVariants(newVariants);

      const slotId: keyof MemberMediaForm = 'closeup';
      const newForm = effectiveKitType === 'home'
        ? { ...form, [slotId]: { url: croppedUrl, caption: '' } }
        : form;
      if (effectiveKitType === 'home') setForm(newForm);

      const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVariants);
      await handleMetadataUpdate(updatedMeta);

    } catch (err) {
      console.error('Closeup crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingCloseup(false);
    }
  };

  // AI Generation Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPreselectedTemplate, setAiPreselectedTemplate] = useState<string | undefined>();
  const [aiSelectedKitUrl, setAiSelectedKitUrl] = useState<string | null>(null);
  const [aiSelectedKitType, setAiSelectedKitType] = useState<string>('home');
  const [aiInputPersonUrl, setAiInputPersonUrl] = useState<string | null>(null); // For intro/celebration: player in tenue
  const [aiSelectedStyleVariant, setAiSelectedStyleVariant] = useState<string | null>(null); // For intro/celebration: pose style

  // Set default kit type based on member role
  useEffect(() => {
    if (membership?.role) {
      if (membership.role === 'goalkeeper') setAiSelectedKitType('goalkeeper');
      else if (membership.role === 'coach') setAiSelectedKitType('coach');
      else if (membership.role === 'assistant') setAiSelectedKitType('assistant');
      else setAiSelectedKitType('home');
    }
  }, [membership?.role]);

  // Video Preview Modal State (click-to-enlarge)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Active AI generation jobs for this member (shows badge on page)
  const { activeJobs: memberActiveJobs } = useGenerationJobs({
    membership_id: membershipId,
    pollInterval: 8000,
  });

  // Fetch parent brand assets (from club) for tenue inheritance
  const clubId = club?.id || project?.id;
  const clubBrand = useBrandProfile({
    projectId: clubId ? String(clubId) : undefined,
    organisationId: String(org?.id || ''),
    autoFetch: !!clubId,
  });

  // Get effective kits from club brand
  const effectiveKits = useMemo(() => {
    const kits: { id: string; label: string; icon: string; url: string | null }[] = [];
    for (const role of KIT_ROLES) {
      // Try combined first, then processed
      let asset = clubBrand.getAsset?.(`kit_${role.id}_combined`) || clubBrand.getAsset?.(`kit_${role.id}`);
      kits.push({
        id: role.id,
        label: role.label,
        icon: role.icon,
        url: asset ? getAssetUrl(asset.url) : null,
      });
    }
    return kits;
  }, [clubBrand]);

  // Handler to open AI modal for a specific template
  const openAiModal = (templateId: string, defaultKitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null) => {
    setAiPreselectedTemplate(templateId);
    const kitType = defaultKitType || 'home';
    setAiSelectedKitType(kitType);
    // Find the kit URL for the selected type
    const kit = effectiveKits.find(k => k.id === kitType);
    setAiSelectedKitUrl(kit?.url || null);
    // For intro/celebration: use the player in tenue as input
    setAiInputPersonUrl(playerInTenueUrl || null);
    // For intro/celebration: set the style variant
    setAiSelectedStyleVariant(styleVariant || null);
    setShowAiModal(true);
  };

  // Handler to update membership metadata (e.g., for deleting assets)
  // Pass `targetMembershipId` explicitly to avoid stale-closure bugs when navigating
  // between member pages (membership state lags behind URL param by one render cycle).
  const handleMetadataUpdate = async (newMetadata: any, targetMembershipId?: string) => {
    if (!project) return;

    // Always prefer the explicitly-passed ID; fall back to URL param, then state.
    const idToUse = targetMembershipId || membershipId || membership?.id;
    if (!idToUse) {
      console.error('handleMetadataUpdate: no membership ID available — aborting to avoid cross-member pollution');
      return;
    }
    if (membership?.id && idToUse !== String(membership.id)) {
      console.warn(
        `⚠️ handleMetadataUpdate: using targetId=${idToUse} but membership.id=${membership.id}. ` +
        'State may be stale — proceeding with URL-derived ID.',
      );
    }

    setSaving(true);
    setSaveError(null);

    try {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';

      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project.id}/members/${idToUse}/`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({ metadata: newMetadata }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to update: ${res.status}`);
      }

      const json = await res.json();
      const updated = json?.data || json;
      setMembership(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
      console.error('Metadata update failed:', e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!membership) return;
    setForm(readAssetsFromMembership(membership));
    setVideoVariants(readVideoVariantsFromMembership(membership));
  }, [membership]);

  // ── Resolve raw S3 storage paths to presigned URLs for display ──
  useEffect(() => {
    // Collect all raw S3 keys from videoVariants and form
    const paths: string[] = [];
    for (const category of ['fullbody', 'closeup', 'intro', 'celebration'] as const) {
      const variants = videoVariants[category];
      if (variants) {
        for (const val of Object.values(variants)) {
          const url = getBestUrl(val);
          if (url && !url.startsWith('http')) paths.push(url);
        }
      }
    }
    // Also check form slots
    for (const slot of Object.values(form)) {
      if (slot && typeof slot === 'object' && 'url' in slot) {
        const u = (slot as { url?: string }).url;
        if (u && !u.startsWith('http')) paths.push(u);
      }
    }
    if (paths.length === 0) return;

    // Deduplicate and only resolve paths not already cached
    const uniquePaths = [...new Set(paths)].filter((p) => !presignedCache[p]);
    if (uniquePaths.length === 0) return;

    let cancelled = false;
    resolvePresignedUrls(uniquePaths).then((resolved) => {
      if (cancelled) return;
      setPresignedCache((prev) => ({ ...prev, ...resolved }));
    });
    return () => { cancelled = true; };
  }, [videoVariants, form]);

  /**
   * Resolve a storage path to a displayable URL.
   * Uses presigned URL cache for S3 keys, falls back to getAssetUrl.
   */
  const resolveDisplayUrl = useCallback((storagePath: string | null | undefined): string | null => {
    if (!storagePath) return null;
    if (storagePath.startsWith('http')) return storagePath;
    // Check presigned cache first
    if (presignedCache[storagePath]) return presignedCache[storagePath];
    // Fallback to direct S3 URL (may 403 for private buckets, but shows something)
    return getAssetUrl(storagePath);
  }, [presignedCache]);

  // ── Reset membership state immediately when navigating to a different member ──
  // Without this, `membership` still holds the previous member's data during the
  // async fetch, creating a window where the AI modal callback writes to the
  // wrong member's metadata (stale-closure bug).
  useEffect(() => {
    setMembership(null);
  }, [membershipId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!orgSlugOrId || !projectSlugOrId || !seasonKeyOrId || !membershipId) {
          throw new Error('Missing route parameters');
        }
        if (!UUID_RE.test(membershipId)) {
          throw new Error('Member id must be a UUID');
        }

        const looksLikeIdentifier = (value: string) => {
          const v = String(value || '').trim();
          if (!v) return false;
          if (/^\d+$/.test(v)) return true;
          if (UUID_RE.test(v)) return true;
          return false;
        };

        const teamScopedProjectUrl = (org: string, club: string, team: string) =>
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(org)}/projects/${encodeURIComponent(club)}/teams/${encodeURIComponent(team)}/`;

        const defaultProjectUrl = (team: string) =>
          `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(team)}/`;

        const projectUrl =
          isTeamRoute && clubSlugOrId && projectSlugOrId && !looksLikeIdentifier(projectSlugOrId)
            ? teamScopedProjectUrl(orgSlugOrId, clubSlugOrId, projectSlugOrId)
            : defaultProjectUrl(projectSlugOrId);

        const [orgRes, projectRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, { credentials: 'include' }),
          fetch(projectUrl, { credentials: 'include' }),
        ]);

        if (!orgRes.ok) throw new Error('Failed to load federation');
        if (!projectRes.ok) throw new Error('Failed to load team');

        const orgJson = unwrap<Organisation>(await orgRes.json());
        const projectJson = unwrap<Project>(await projectRes.json());

        if (cancelled) return;
        setOrg(orgJson);
        setProject(projectJson);

        if (isTeamRoute) {
          const clubRes = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' }
          );
          if (clubRes.ok) {
            const clubJson = unwrap<Project>(await clubRes.json());
            if (!cancelled) setClub(clubJson);
          }
        }

        // Resolve season UUID from key-or-id
        const rootPeriodsUrl = `${apiBaseUrl}/api/v1/periods/?page_size=500&project_id=${encodeURIComponent(
          projectJson.id
        )}&parent_id=null`;
        const allPeriods = await fetchAllPages<any>(
          rootPeriodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:${projectJson.id}` }
        );

        const seasonOptions = (Array.isArray(allPeriods) ? allPeriods : []).filter(isSeasonPeriod);
        const isUuidParam = looksLikeUuid(seasonKeyOrId);
        const seasonFromList = isUuidParam
          ? seasonOptions.find((p: any) => String(p.id) === String(seasonKeyOrId))
          : seasonOptions.find((p: any) => periodPathKey(p) === String(seasonKeyOrId));

        const seasonUuid = String(seasonFromList?.id || (isUuidParam ? seasonKeyOrId : '')).trim();
        if (!seasonUuid) throw new Error('Season not found');

        if (!cancelled) setResolvedSeasonId(seasonUuid);

        const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, {
          credentials: 'include',
        });
        if (seasonRes.ok) {
          const seasonJson = unwrap<Period>(await seasonRes.json());
          if (!cancelled) setSeason(seasonJson);
        }

        const memberRes = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectJson.id)}/members/${encodeURIComponent(membershipId)}/`,
          { credentials: 'include' }
        );

        if (!memberRes.ok) {
          const detail = await memberRes.text().catch(() => '');
          throw new Error(detail || 'Failed to load member');
        }

        const memberJson = unwrap<any>(await memberRes.json());
        if (!cancelled) setMembership(memberJson);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load member');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, clubSlugOrId, isTeamRoute, membershipId, orgSlugOrId, projectSlugOrId, seasonKeyOrId]);

  const seasonKeyForLinks = periodPathKey(season as any) || String(seasonKeyOrId || resolvedSeasonId).trim();

  const title = membership ? `Member: ${getUserDisplayName(membership)}` : 'Member';

  const breadcrumbs = useMemo(() => {
    const orgCrumb = org
      ? { label: org.name, onClick: () => navigate(`/organisations/${org.slug || org.id}`) }
      : { label: 'Federation' };

    const clubCrumb =
      isTeamRoute && club
        ? {
            label: club.name,
            onClick: () =>
              navigate(
                isOrgRoutes
                  ? `/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`
                  : `/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`
              ),
          }
        : null;

    const teamCrumb = project
      ? {
          label: project.name,
          onClick: () =>
            navigate(
              isOrgRoutes
                ? isTeamRoute
                  ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}`
                  : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
                : isTeamRoute
                  ? `/${orgSlugOrId}/${clubSlugOrId}/${project.slug || project.id}`
                  : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
            ),
        }
      : { label: 'Team' };

    const seasonLabel = season?.name || 'Season';

    return [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      orgCrumb,
      ...(clubCrumb ? [clubCrumb] : []),
      teamCrumb,
      {
        label: seasonLabel,
        onClick: () => {
          if (!seasonKeyForLinks) return;
          navigate(`${seasonsBasePath}/${seasonKeyForLinks}`);
        },
      },
      { label: 'Member Profile' },
    ];
  }, [
    club,
    clubSlugOrId,
    isOrgRoutes,
    isTeamRoute,
    navigate,
    org,
    orgSlugOrId,
    project,
    season?.name,
    seasonKeyForLinks,
    seasonsBasePath,
  ]);

  const save = async () => {
    if (!membership || !project || !userCanEditProject) return;

    setSaving(true);
    setSaveError(null);

    try {
      const nextMetadata = mergeAssetsIntoMetadata((membership as any)?.metadata, form, videoVariants);

      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(membership.id)}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({ metadata: nextMetadata }),
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Failed to save');
      }

      const raw = await res.json().catch(() => null);
      const updated = (raw as any)?.data || raw || null;
      setMembership(updated ? { ...(membership as any), ...(updated as any) } : membership);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="has-mobile-action-bar">
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs as any}
        actions={
          <div className="hide-mobile" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(() => {
              const isActive =
                !!membership &&
                String(activeContext?.membership?.id ?? '') === String((membership as any)?.id ?? '');

              const canMakeActive =
                !!membership &&
                String((membership as any)?.user?.id ?? '') &&
                String((user as any)?.id ?? '') &&
                String((membership as any)?.user?.id ?? '') === String((user as any)?.id ?? '');

              return (
                <button
                  type="button"
                  className="app-action-button"
                  onClick={async () => {
                    if (!membership || isActive) return;
                    try {
                      setActivatingContext(true);
                      await setActiveContext('membership', String((membership as any).id));
                      const ctx = await getActiveContext();
                      setActiveContextState(ctx);
                    } finally {
                      setActivatingContext(false);
                    }
                  }}
                  disabled={!canMakeActive || activatingContext || isActive}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: isActive ? '1px solid #10b981' : '1px solid var(--app-border)',
                    background: isActive ? '#dcfce7' : 'var(--app-surface)',
                    color: isActive ? '#166534' : 'var(--app-text)',
                    fontWeight: isActive ? 600 : 500,
                    opacity: !canMakeActive || activatingContext || isActive ? 0.8 : 1,
                    cursor: !canMakeActive || activatingContext || isActive ? 'not-allowed' : 'pointer',
                  }}
                  title={
                    canMakeActive
                      ? 'Set this member as your active context'
                      : 'You can only set your own membership as active context'
                  }
                >
                  {isActive ? '✓ Active Context' : 'Make active'}
                </button>
              );
            })()}
            <Button
              variant="secondary"
              onClick={() => {
                if (!seasonKeyForLinks) return;
                navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`);
              }}
            >
              Back to squad
            </Button>
            <Button
              variant={userCanEditProject ? 'primary' : 'secondary'}
              disabled={!userCanEditProject || saving || loading}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      />

      {/* Mobile Tab Bar */}
      <MobileTabBar
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'profile', label: 'Profile Photo' },
          { id: 'legacy_photo', label: 'Legacy Photo' },
          { id: 'kit', label: 'In Tenue' },
          { id: 'closeup', label: 'Close-up' },
          { id: 'intro', label: 'Short Intro' },
          { id: 'celebration', label: 'Celebration' },
          { id: 'legacy', label: 'Legacy in Tenue' },
          { id: 'assets', label: 'Assets' },
          { id: 'workflow', label: 'Workflow' },
          { id: 'identity', label: 'Identity' },
        ]}
        activeTab={activeTab}
      />

      <PageContent>
        {loading && <LoadingState message="Loading member…" />}
        {!loading && error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && membership && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {saveError && (
                  <Alert variant="error">{saveError}</Alert>
                )}

                {/* Active AI generation jobs banner */}
                {memberActiveJobs.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: '#1d4ed820',
                    border: '1px solid #3b82f6',
                    borderRadius: 8,
                    fontSize: 13,
                  }}>
                    <span style={{ fontSize: 18 }}>⏳</span>
                    <div style={{ flex: 1 }}>
                      <strong>AI generatie bezig</strong>
                      {' — '}
                      {memberActiveJobs.map(j => j.label || j.template_id).join(', ')}
                      {'. Je krijgt een melding zodra het klaar is.'}
                    </div>
                    <a
                      href="/approvals?tab=ai_queue"
                      style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12 }}
                    >
                      Bekijk queue →
                    </a>
                  </div>
                )}

                {/* Overview Tab - Media completion matrix */}
                {activeTab === 'overview' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800 }}>Media Overview</div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Track which media assets have been uploaded for this member's season profile.
                      </div>

                      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {MEDIA_SLOTS.map((slot) => {
                          const hasContent = Boolean(form[slot.id]?.url || form[slot.id]?.caption);
                          return (
                            <div
                              key={slot.id}
                              onClick={() => navigateToTab(slot.id)}
                              style={{
                                padding: '14px',
                                borderRadius: '8px',
                                border: `1px solid ${hasContent ? '#10b981' : 'var(--app-border)'}`,
                                background: hasContent ? '#dcfce7' : 'var(--app-surface)',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>{slot.icon}</span>
                                <span style={{ fontWeight: 600 }}>{slot.label}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '14px' }}>
                                  {hasContent ? '✅' : '⬜'}
                                </span>
                              </div>
                              <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.7 }}>
                                {slot.description}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: '20px', padding: '12px', background: 'var(--app-muted)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          Completion: {MEDIA_SLOTS.filter((s) => form[s.id]?.url || form[s.id]?.caption).length} / {MEDIA_SLOTS.length} media slots
                        </div>
                        <div style={{ marginTop: '8px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(MEDIA_SLOTS.filter((s) => form[s.id]?.url || form[s.id]?.caption).length / MEDIA_SLOTS.length) * 100}%`,
                              background: '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Dynamic media slot tabs */}
                {/* Profile Photo tab — photo picker like Identity */}
                {activeTab === 'profile' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>📷</span>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>Profile Photo</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Select or upload a profile photo for this member.
                      </div>

                      <div style={{ marginTop: '20px' }}>
                        {/* Current profile photo */}
                        <div style={{ marginBottom: '24px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Current Photo</div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{
                              width: '160px',
                              height: '160px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              backgroundColor: 'var(--app-surface-secondary)',
                              border: '2px solid var(--app-border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {(profilePreview || form.profile?.url || membership?.user?.avatar_url) ? (
                                <img
                                  src={profilePreview || form.profile?.url || membership?.user?.avatar_url}
                                  alt={getUserDisplayName(membership)}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: profileUploading ? 0.5 : 1 }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div style={{ fontSize: '48px', opacity: 0.3 }}>👤</div>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              {(profilePreview || form.profile?.url || membership?.user?.avatar_url) ? (
                                <span style={{ fontSize: 13, color: '#28a745', fontWeight: 600 }}>✓ Profielfoto ingesteld</span>
                              ) : (
                                <div style={{ fontSize: 13, color: 'var(--app-muted-text)', fontStyle: 'italic' }}>
                                  No profile photo set
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Upload area */}
                        <div
                          onClick={() => userCanEditProject && !profileUploading && profileInputRef.current?.click()}
                          style={{
                            padding: '24px',
                            border: '2px dashed var(--app-border)',
                            borderRadius: '8px',
                            textAlign: 'center',
                            opacity: userCanEditProject ? 1 : 0.5,
                            cursor: userCanEditProject && !profileUploading ? 'pointer' : 'default',
                            transition: 'border-color 0.2s',
                          }}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!userCanEditProject || profileUploading) return;
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) handleProfilePhotoUpload(file);
                          }}
                        >
                          <input
                            ref={profileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleProfilePhotoUpload(file);
                              e.target.value = '';
                            }}
                          />
                          {profileUploading ? (
                            <>
                              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                              <div style={{ fontSize: '14px', fontWeight: 600 }}>Uploaden...</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                              <div style={{ fontSize: '14px', fontWeight: 600 }}>Upload Profielfoto</div>
                              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                                Klik of sleep een afbeelding hierheen
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {!userCanEditProject && (
                        <div style={{ marginTop: '16px' }}>
                          <Alert variant="info">You don't have permission to edit this member's media.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Other media slot tabs — preview + upload only (no URL/caption inputs) */}
                {/* AI-generative slots (kit, closeup) are handled separately below */}
                {MEDIA_SLOTS.filter((s) => s.id !== 'profile' && s.id !== 'kit' && s.id !== 'closeup').map((slot) => activeTab === slot.id && (
                  <Card key={slot.id}>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>{slot.icon}</span>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>{slot.label}</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        {slot.description}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '20px' }}>
                        {form[slot.id]?.url && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Preview</div>
                            <div style={{
                              border: '1px solid var(--app-border)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#f3f4f6',
                              maxWidth: '400px',
                            }}>
                              {(slot.id === 'intro' || slot.id === 'celebration') && form[slot.id]?.url?.includes('.mp4') ? (
                                <video
                                  src={form[slot.id].url}
                                  controls
                                  style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                />
                              ) : (
                                <img
                                  src={form[slot.id].url}
                                  alt={slot.label}
                                  style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}

                        <div style={{
                          padding: '24px',
                          border: '2px dashed var(--app-border)',
                          borderRadius: '8px',
                          textAlign: 'center',
                          opacity: userCanEditProject ? 1 : 0.5,
                        }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Upload {slot.label}</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                            Drag & drop or click to upload
                          </div>
                          <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '8px' }}>
                            (File upload coming soon)
                          </div>
                        </div>
                      </div>

                      {!userCanEditProject && (
                        <div style={{ marginTop: '16px' }}>
                          <Alert variant="info">You don't have permission to edit this member's media.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {/* In Tenue (Kit) Tab - AI Generative with tenue selector */}
                {activeTab === 'kit' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>👕</span>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>In Tenue</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Badge variant={userCanEditProject ? 'default' : 'info'}>
                            {userCanEditProject ? 'Editable' : 'Read-only'}
                          </Badge>
                          {userCanEditProject && (
                            <Button
                              size="sm"
                              onClick={() => openAiModal('fullbody_in_tenue')}
                              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
                            >
                              ✨ AI Genereren
                            </Button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Fullbody foto van de speler in het seizoenstenue. Selecteer een tenue en genereer met AI.
                      </div>

                      {/* Current result preview */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '20px' }}>
                        {form.kit?.url && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Huidig Resultaat</div>
                            <div style={{
                              border: '1px solid var(--app-border)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#f3f4f6',
                              maxWidth: '300px',
                            }}>
                              <img
                                src={form.kit.url}
                                alt="In Tenue"
                                style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Tenue Selector */}
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Selecteer Tenue (van Seizoen)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                            {effectiveKits.map((kit) => (
                              <button
                                key={kit.id}
                                onClick={() => {
                                  setAiSelectedKitType(kit.id);
                                  setAiSelectedKitUrl(kit.url);
                                }}
                                style={{
                                  padding: '12px 8px',
                                  border: aiSelectedKitType === kit.id
                                    ? '2px solid #6366f1'
                                    : '1px solid var(--app-border)',
                                  borderRadius: '8px',
                                  background: aiSelectedKitType === kit.id
                                    ? 'rgba(99, 102, 241, 0.1)'
                                    : 'var(--app-surface)',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                }}
                              >
                                {kit.url ? (
                                  <img
                                    src={kit.url}
                                    alt={kit.label}
                                    style={{ width: '60px', height: '80px', objectFit: 'contain', margin: '0 auto 8px' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div style={{ width: '60px', height: '80px', background: '#e5e7eb', borderRadius: '4px', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    {kit.icon}
                                  </div>
                                )}
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>{kit.icon} {kit.label}</div>
                                {!kit.url && <div style={{ fontSize: '10px', color: '#888' }}>Niet beschikbaar</div>}
                              </button>
                            ))}
                          </div>
                          {!effectiveKits.some(k => k.url) && (
                            <Alert variant="warning" style={{ marginTop: '12px' }}>
                              Geen tenues beschikbaar. Upload eerst tenues op de club-pagina.
                            </Alert>
                          )}
                        </div>

                        {/* AI Generation CTA */}
                        {userCanEditProject && effectiveKits.some(k => k.url) && (
                          <div style={{ marginTop: '20px', padding: '20px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Genereer met AI</div>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '16px' }}>
                              Gebruik de profielfoto en het geselecteerde tenue om een fullbody foto te genereren.
                            </div>
                            <Button onClick={() => openAiModal('fullbody_in_tenue', aiSelectedKitType)}>
                              🎨 Start AI Generatie
                            </Button>
                          </div>
                        )}

                        {/* Manual upload fallback */}
                        <div style={{
                          padding: '24px',
                          border: '2px dashed var(--app-border)',
                          borderRadius: '8px',
                          textAlign: 'center',
                          opacity: userCanEditProject ? 1 : 0.5,
                          marginTop: '16px',
                        }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Of upload handmatig</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                            Drag & drop of klik om te uploaden
                          </div>
                        </div>
                      </div>

                      {!userCanEditProject && (
                        <div style={{ marginTop: '16px' }}>
                          <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Close-up Tab - AI Generative */}
                {activeTab === 'closeup' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>📸</span>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>Close-up</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Badge variant={userCanEditProject ? 'default' : 'info'}>
                            {userCanEditProject ? 'Editable' : 'Read-only'}
                          </Badge>
                        </div>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Close-up portret van de speler in het seizoenstenue. Transparante achtergrond.
                      </div>

                      {/* Current result preview */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '20px' }}>
                        {form.closeup?.url && (
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Huidig Resultaat</div>
                            <div style={{
                              border: '1px solid var(--app-border)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: '#f3f4f6',
                              maxWidth: '300px',
                            }}>
                              <img
                                src={form.closeup.url}
                                alt="Close-up"
                                style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Tenue Selector for close-up */}
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Selecteer Tenue (van Seizoen)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                            {effectiveKits.map((kit) => (
                              <button
                                key={kit.id}
                                onClick={() => {
                                  setAiSelectedKitType(kit.id);
                                  setAiSelectedKitUrl(kit.url);
                                }}
                                style={{
                                  padding: '12px 8px',
                                  border: aiSelectedKitType === kit.id
                                    ? '2px solid #6366f1'
                                    : '1px solid var(--app-border)',
                                  borderRadius: '8px',
                                  background: aiSelectedKitType === kit.id
                                    ? 'rgba(99, 102, 241, 0.1)'
                                    : 'var(--app-surface)',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                }}
                              >
                                {kit.url ? (
                                  <img
                                    src={kit.url}
                                    alt={kit.label}
                                    style={{ width: '60px', height: '80px', objectFit: 'contain', margin: '0 auto 8px' }}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div style={{ width: '60px', height: '80px', background: '#e5e7eb', borderRadius: '4px', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                    {kit.icon}
                                  </div>
                                )}
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>{kit.icon} {kit.label}</div>
                                {!kit.url && <div style={{ fontSize: '10px', color: '#888' }}>Niet beschikbaar</div>}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Crop from Fullbody */}
                        {userCanEditProject && getBestUrl(videoVariants.fullbody[aiSelectedKitType]) && (
                          <div style={{ marginTop: '20px', padding: '20px', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✂️</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Crop uit Fullbody</div>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '16px' }}>
                              Automatisch bijsnijden van hoofd + schouders uit de fullbody afbeelding.
                            </div>
                            <Button
                              onClick={() => cropCloseupFromFullbody(getBestUrl(videoVariants.fullbody[aiSelectedKitType])!, aiSelectedKitType)}
                              disabled={croppingCloseup}
                            >
                              {croppingCloseup ? '⏳ Bijsnijden...' : '✂️ Crop Close-up'}
                            </Button>
                          </div>
                        )}

                        {/* AI Generation CTA */}
                        {userCanEditProject && effectiveKits.some(k => k.url) && (
                          <div style={{ marginTop: '16px', padding: '20px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Of genereer met AI</div>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '16px' }}>
                              {!getBestUrl(videoVariants.fullbody[aiSelectedKitType])
                                ? '⚠️ Je moet eerst een "Player in Tenue (Fullbody)" genereren om een close-up te maken.'
                                : 'Gebruik AI om een close-up te genereren (kost credits).'
                              }
                            </div>
                            <Button
                              variant="secondary"
                              onClick={() => openAiModal('closeup_in_tenue', aiSelectedKitType, getBestUrl(videoVariants.fullbody[aiSelectedKitType]))}
                              disabled={!getBestUrl(videoVariants.fullbody[aiSelectedKitType])}
                            >
                              🎨 Start AI Generatie
                            </Button>
                          </div>
                        )}

                        {/* Manual upload fallback */}
                        <div style={{
                          padding: '24px',
                          border: '2px dashed var(--app-border)',
                          borderRadius: '8px',
                          textAlign: 'center',
                          opacity: userCanEditProject ? 1 : 0.5,
                          marginTop: '16px',
                        }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Of upload handmatig</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                            Drag & drop of klik om te uploaden
                          </div>
                        </div>
                      </div>

                      {!userCanEditProject && (
                        <div style={{ marginTop: '16px' }}>
                          <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Short Intro Tab - AI Generated Video Variants */}
                {activeTab === 'intro' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>🎬</span>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>Short Intro</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Korte intro video's van de speler in verschillende poses. Vereist eerst een "Player in Tenue" afbeelding.
                      </div>

                      {/* Per-Kit Variant Grid for Short Intro */}
                      {effectiveKits.map((kit) => {
                        // Use per-kit fullbody URL, fallback to form.kit for home
                        const fullbodyVal = videoVariants.fullbody[kit.id]
                          || (kit.id === 'home' ? form.kit?.url : null)
                          || null;
                        const playerInTenueUrl = getVariantDisplayUrl(fullbodyVal);
                        const hasPlayerInTenue = Boolean(playerInTenueUrl);

                        const introVariantDefs = [
                          { id: 'arms_crossed', icon: '🙅', label: 'Armen over elkaar' },
                          { id: 'hand_up', icon: '✋', label: 'Hand omhoog' },
                          { id: 'thumbs_up', icon: '👍', label: 'Duim omhoog' },
                        ];

                        return (
                          <div key={`intro-kit-${kit.id}`} style={{ marginTop: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              {kit.url ? (
                                <img
                                  src={kit.url}
                                  alt={kit.label}
                                  style={{ width: '32px', height: '42px', objectFit: 'contain' }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <span style={{ fontSize: '20px' }}>{kit.icon}</span>
                              )}
                              <div style={{ fontSize: '14px', fontWeight: 700 }}>{kit.label}</div>
                              {hasPlayerInTenue && (
                                <Badge variant="default" style={{ marginLeft: 'auto' }}>✓ Player in Tenue</Badge>
                              )}
                              {!hasPlayerInTenue && (
                                <Badge variant="info" style={{ marginLeft: 'auto' }}>⚠️ Genereer eerst Player in Tenue</Badge>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', opacity: hasPlayerInTenue ? 1 : 0.5 }}>
                              {introVariantDefs.map((variant) => {
                                const compositeKey = `${kit.id}_${variant.id}`;
                                const variantRaw = videoVariants.intro[compositeKey];
                                const variantUrl = getBestUrl(variantRaw) || '';
                                const hasVideo = Boolean(variantUrl);
                                const resolvedUrl = hasVideo ? resolveDisplayUrl(variantUrl) : null;
                                const variantLineupReady = isLineupReady(variantRaw);
                                const variantProcessing = isProcessing(variantRaw);
                                const normalizedVariant = normalizeVariantValue(variantRaw as any);
                                const isCancellingOrProcessing =
                                  normalizedVariant?.processing_state === 'processing' ||
                                  normalizedVariant?.processing_state === 'cancelling';

                                return (
                                  <div key={variant.id} style={{
                                    border: hasVideo ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: 'var(--app-surface)',
                                  }}>
                                    <div
                                      onClick={() => { if (resolvedUrl) setVideoPreviewUrl(resolvedUrl); }}
                                      style={{
                                        aspectRatio: '9/16',
                                        background: (hasVideo && !variantLineupReady)
                                          ? '#000'
                                          : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '180px',
                                        position: 'relative',
                                        cursor: hasVideo ? 'pointer' : 'default',
                                      }}>
                                      {hasVideo && resolvedUrl ? (
                                        <>
                                          <video
                                            src={resolvedUrl}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            muted
                                            loop
                                            playsInline
                                            autoPlay
                                            onError={(e) => {
                                              (e.target as HTMLVideoElement).style.display = 'none';
                                            }}
                                          />
                                          <div style={{
                                            position: 'absolute',
                                            top: '6px',
                                            right: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '3px',
                                            alignItems: 'flex-end',
                                          }}>
                                            <div style={{
                                              background: 'rgba(99, 102, 241, 0.85)',
                                              color: '#fff',
                                              fontSize: '9px',
                                              fontWeight: 700,
                                              padding: '2px 5px',
                                              borderRadius: '4px',
                                            }}>
                                              AI
                                            </div>
                                            <ProcessingBadge value={variantRaw} />
                                          </div>
                                        </>
                                      ) : (
                                        <div style={{ color: 'var(--app-text-muted)', fontSize: '12px', textAlign: 'center', padding: '8px' }}>
                                          Niet gegenereerd
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ padding: '10px' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>
                                        {variant.icon} {variant.label}
                                      </div>
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {hasVideo ? (
                                          <>
                                            <Button
                                              size="sm"
                                              onClick={() => openAiModal('member_intro', kit.id, playerInTenueUrl, variant.id)}
                                              disabled={!hasPlayerInTenue}
                                              style={{ fontSize: '10px', padding: '4px 8px', flex: 1 }}
                                            >
                                              Opnieuw
                                            </Button>
                                            {!variantProcessing && (
                                              <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={async () => {
                                                  const result = await triggerAssetProcessing(
                                                    apiBaseUrl, membershipId!, 'intro', kit.id, variant.id
                                                  );
                                                  if (result.ok) {
                                                    const rawUrl = getVariantRawUrl(variantRaw) || '';
                                                    const newVV: VideoVariantsMap = {
                                                      ...videoVariants,
                                                      intro: {
                                                        ...videoVariants.intro,
                                                        [compositeKey]: {
                                                          raw: rawUrl,
                                                          processed: null,
                                                          processing_state: 'processing' as const,
                                                        },
                                                      },
                                                    };
                                                    setVideoVariants(newVV);
                                                    startProcessingPoll('intro', kit.id, variant.id);
                                                  }
                                                }}
                                                style={{
                                                  fontSize: '10px',
                                                  padding: '4px 8px',
                                                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                  border: 'none',
                                                  color: '#fff',
                                                }}
                                              >
                                                {variantLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                              </Button>
                                            )}

                                            {isCancellingOrProcessing && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={async () => {
                                                  const result = await cancelAssetProcessing(
                                                    apiBaseUrl,
                                                    membershipId!,
                                                    'intro',
                                                    kit.id,
                                                    variant.id,
                                                  );
                                                  if (result.ok) {
                                                    const rawUrl = getVariantRawUrl(variantRaw) || '';
                                                    const newVV: VideoVariantsMap = {
                                                      ...videoVariants,
                                                      intro: {
                                                        ...videoVariants.intro,
                                                        [compositeKey]: {
                                                          raw: rawUrl,
                                                          processed: null,
                                                          processing_state: 'cancelling' as const,
                                                        },
                                                      },
                                                    };
                                                    setVideoVariants(newVV);
                                                    startProcessingPoll('intro', kit.id, variant.id);
                                                  }
                                                }}
                                                style={{ fontSize: '10px', padding: '4px 6px', color: '#f59e0b' }}
                                              >
                                                ⏹️ Cancel
                                              </Button>
                                            )}
                                            {variantLineupReady && (
                                              <span style={{ fontSize: '9px', padding: '3px 6px', color: '#10b981', fontWeight: 600 }}>✓ Ready</span>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={async () => {
                                                if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) return;
                                                const newVV: VideoVariantsMap = {
                                                  ...videoVariants,
                                                  intro: { ...videoVariants.intro },
                                                };
                                                delete newVV.intro[compositeKey];
                                                setVideoVariants(newVV);
                                                const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                                                await handleMetadataUpdate(updatedMeta);
                                              }}
                                              style={{ fontSize: '10px', padding: '4px 6px', color: '#ef4444' }}
                                            >
                                              🗑️
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() => openAiModal('member_intro', kit.id, playerInTenueUrl, variant.id)}
                                            disabled={!hasPlayerInTenue}
                                            style={{ fontSize: '10px', padding: '4px 8px', width: '100%' }}
                                          >
                                            ✨ Genereer
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {!userCanEditProject && (
                        <div style={{ marginTop: '16px' }}>
                          <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Goal Celebration Tab - AI Generated Video Variants */}
                {activeTab === 'celebration' && (
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>🎉</span>
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>Goal Celebration</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div style={{ marginTop: '6px', opacity: 0.75, fontSize: '13px' }}>
                        Goal viering animaties van de speler. Vereist eerst een "Player in Tenue" afbeelding.
                      </div>

                      {/* Per-Kit Variant Grid for Goal Celebration */}
                      {effectiveKits.map((kit) => {
                        const fullbodyVal = videoVariants.fullbody[kit.id]
                          || (kit.id === 'home' ? form.kit?.url : null)
                          || null;
                        const playerInTenueUrl = getVariantDisplayUrl(fullbodyVal);
                        const hasPlayerInTenue = Boolean(playerInTenueUrl);

                        const celebrationVariantDefs = [
                          { id: 'arms_wide', icon: '🙌', label: 'Armen wijd' },
                          { id: 'fist_pump', icon: '✊', label: 'Vuist omhoog' },
                          { id: 'point_to_sky', icon: '☝️', label: 'Wijs naar hemel' },
                          { id: 'slide', icon: '🛝', label: 'Knieën slide' },
                        ];

                        return (
                          <div key={`celebration-kit-${kit.id}`} style={{ marginTop: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              {kit.url ? (
                                <img
                                  src={kit.url}
                                  alt={kit.label}
                                  style={{ width: '32px', height: '42px', objectFit: 'contain' }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <span style={{ fontSize: '20px' }}>{kit.icon}</span>
                              )}
                              <div style={{ fontSize: '14px', fontWeight: 700 }}>{kit.label}</div>
                              {hasPlayerInTenue && (
                                <Badge variant="default" style={{ marginLeft: 'auto' }}>✓ Player in Tenue</Badge>
                              )}
                              {!hasPlayerInTenue && (
                                <Badge variant="info" style={{ marginLeft: 'auto' }}>⚠️ Genereer eerst Player in Tenue</Badge>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', opacity: hasPlayerInTenue ? 1 : 0.5 }}>
                              {celebrationVariantDefs.map((variant) => {
                                const compositeKey = `${kit.id}_${variant.id}`;
                                const variantRaw = videoVariants.celebration[compositeKey];
                                const variantUrl = getBestUrl(variantRaw) || '';
                                const hasVideo = Boolean(variantUrl);
                                const resolvedUrl = hasVideo ? resolveDisplayUrl(variantUrl) : null;
                                const variantLineupReady = isLineupReady(variantRaw);
                                const variantProcessing = isProcessing(variantRaw);
                                const normalizedVariant = normalizeVariantValue(variantRaw as any);
                                const isCancellingOrProcessing =
                                  normalizedVariant?.processing_state === 'processing' ||
                                  normalizedVariant?.processing_state === 'cancelling';

                                return (
                                  <div key={variant.id} style={{
                                    border: hasVideo ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: 'var(--app-surface)',
                                  }}>
                                    <div
                                      onClick={() => { if (resolvedUrl) setVideoPreviewUrl(resolvedUrl); }}
                                      style={{
                                        aspectRatio: '9/16',
                                        background: (hasVideo && !variantLineupReady)
                                          ? '#000'
                                          : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '180px',
                                        position: 'relative',
                                        cursor: hasVideo ? 'pointer' : 'default',
                                      }}>
                                      {hasVideo && resolvedUrl ? (
                                        <>
                                          <video
                                            src={resolvedUrl}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            muted
                                            loop
                                            playsInline
                                            autoPlay
                                            onError={(e) => {
                                              (e.target as HTMLVideoElement).style.display = 'none';
                                            }}
                                          />
                                          <div style={{
                                            position: 'absolute',
                                            top: '6px',
                                            right: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '3px',
                                            alignItems: 'flex-end',
                                          }}>
                                            <div style={{
                                              background: 'rgba(99, 102, 241, 0.85)',
                                              color: '#fff',
                                              fontSize: '9px',
                                              fontWeight: 700,
                                              padding: '2px 5px',
                                              borderRadius: '4px',
                                            }}>
                                              AI
                                            </div>
                                            <ProcessingBadge value={variantRaw} />
                                          </div>
                                        </>
                                      ) : (
                                        <div style={{ color: 'var(--app-text-muted)', fontSize: '12px', textAlign: 'center', padding: '8px' }}>
                                          Niet gegenereerd
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ padding: '10px' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '8px' }}>
                                        {variant.icon} {variant.label}
                                      </div>
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {hasVideo ? (
                                          <>
                                            <Button
                                              size="sm"
                                              onClick={() => openAiModal('member_goal_celebration', kit.id, playerInTenueUrl, variant.id)}
                                              disabled={!hasPlayerInTenue}
                                              style={{ fontSize: '10px', padding: '4px 8px', flex: 1 }}
                                            >
                                              Opnieuw
                                            </Button>
                                            {!variantProcessing && (
                                              <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={async () => {
                                                  const result = await triggerAssetProcessing(
                                                    apiBaseUrl, membershipId!, 'celebration', kit.id, variant.id
                                                  );
                                                  if (result.ok) {
                                                    const rawUrl = getVariantRawUrl(variantRaw) || '';
                                                    const newVV: VideoVariantsMap = {
                                                      ...videoVariants,
                                                      celebration: {
                                                        ...videoVariants.celebration,
                                                        [compositeKey]: {
                                                          raw: rawUrl,
                                                          processed: null,
                                                          processing_state: 'processing' as const,
                                                        },
                                                      },
                                                    };
                                                    setVideoVariants(newVV);
                                                    startProcessingPoll('celebration', kit.id, variant.id);
                                                  }
                                                }}
                                                style={{
                                                  fontSize: '10px',
                                                  padding: '4px 8px',
                                                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                  border: 'none',
                                                  color: '#fff',
                                                }}
                                              >
                                                {variantLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                              </Button>
                                            )}

                                            {isCancellingOrProcessing && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={async () => {
                                                  const result = await cancelAssetProcessing(
                                                    apiBaseUrl,
                                                    membershipId!,
                                                    'celebration',
                                                    kit.id,
                                                    variant.id,
                                                  );
                                                  if (result.ok) {
                                                    const rawUrl = getVariantRawUrl(variantRaw) || '';
                                                    const newVV: VideoVariantsMap = {
                                                      ...videoVariants,
                                                      celebration: {
                                                        ...videoVariants.celebration,
                                                        [compositeKey]: {
                                                          raw: rawUrl,
                                                          processed: null,
                                                          processing_state: 'cancelling' as const,
                                                        },
                                                      },
                                                    };
                                                    setVideoVariants(newVV);
                                                    startProcessingPoll('celebration', kit.id, variant.id);
                                                  }
                                                }}
                                                style={{ fontSize: '10px', padding: '4px 6px', color: '#f59e0b' }}
                                              >
                                                ⏹️ Cancel
                                              </Button>
                                            )}
                                            {variantLineupReady && (
                                              <span style={{ fontSize: '9px', padding: '3px 6px', color: '#10b981', fontWeight: 600 }}>✓ Ready</span>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={async () => {
                                                if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) return;
                                                const newVV: VideoVariantsMap = {
                                                  ...videoVariants,
                                                  celebration: { ...videoVariants.celebration },
                                                };
                                                delete newVV.celebration[compositeKey];
                                                setVideoVariants(newVV);
                                                const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                                                await handleMetadataUpdate(updatedMeta);
                                              }}
                                              style={{ fontSize: '10px', padding: '4px 6px', color: '#ef4444' }}
                                            >
                                              🗑️
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() => openAiModal('member_goal_celebration', kit.id, playerInTenueUrl, variant.id)}
                                            disabled={!hasPlayerInTenue}
                                            style={{ fontSize: '10px', padding: '4px 8px', width: '100%' }}
                                          >
                                            ✨ Genereer
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {!userCanEditProject && (
                        <div style={{ marginTop: '16px' }}>
                          <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Assets Tab - Member-specific generated assets */}
                {activeTab === 'assets' && (
                  <Card>
                    <div style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>🎨 Gegenereerde Assets</h3>
                      <p style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)', marginBottom: '20px' }}>
                        AI-gegenereerde afbeeldingen van dit lid in het teamtenue.
                      </p>

                      {/* Fullbody Assets Grid */}
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>👕 Fullbody in Tenue</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                          {effectiveKits.map((kit) => {
                            // Per-kit-type: read from videoVariants.fullbody, fallback to form.kit for home
                            const variantVal = videoVariants.fullbody[kit.id]
                              || (kit.id === 'home' ? form.kit?.url : null)
                              || null;
                            const assetUrl = getVariantDisplayUrl(variantVal);
                            const normalized = normalizeVariantValue(variantVal as any);
                            const lineupReady = isLineupReady(variantVal);
                            const currentlyProcessing = isProcessing(variantVal);

                            return (
                              <div
                                key={`fullbody-${kit.id}`}
                                style={{
                                  border: lineupReady
                                    ? '2px solid #10b981'
                                    : assetUrl
                                      ? '2px solid #f59e0b'
                                      : '1px solid var(--vscode-widget-border, #333)',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  background: 'var(--vscode-editor-background)',
                                }}
                              >
                                {/* Preview */}
                                <div
                                  style={{
                                    aspectRatio: '3/4',
                                    background: assetUrl
                                      ? `url(${resolveDisplayUrl(assetUrl)}) center/contain no-repeat`
                                      : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                    position: 'relative',
                                    minHeight: '200px',
                                  }}
                                >
                                  {!assetUrl && (
                                    <div style={{
                                      position: 'absolute',
                                      inset: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'var(--vscode-descriptionForeground)',
                                      fontSize: '12px',
                                    }}>
                                      Niet gegenereerd
                                    </div>
                                  )}
                                  {assetUrl && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '6px',
                                      right: '6px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      alignItems: 'flex-end',
                                    }}>
                                      <span style={{
                                        background: '#6366f1dd',
                                        color: '#fff',
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                      }}>
                                        AI
                                      </span>
                                      <ProcessingBadge value={variantVal} />
                                    </div>
                                  )}
                                  {currentlyProcessing && (
                                    <div style={{
                                      position: 'absolute',
                                      inset: 0,
                                      background: 'rgba(0,0,0,0.4)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                    }}>
                                      ⏳ Bezig met verwerken...
                                    </div>
                                  )}
                                </div>

                                {/* Label + Actions */}
                                <div style={{ padding: '10px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                                    {kit.icon} {kit.label}
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <Button
                                      size="sm"
                                      onClick={() => openAiModal('fullbody_in_tenue', kit.id)}
                                      style={{ fontSize: '11px', padding: '4px 8px' }}
                                    >
                                      {assetUrl ? '🔄 Opnieuw' : '✨ Genereer'}
                                    </Button>
                                    {assetUrl && !currentlyProcessing && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={async () => {
                                          const result = await triggerAssetProcessing(
                                            apiBaseUrl, membershipId!, 'fullbody', kit.id
                                          );
                                          if (result.ok) {
                                            // Optimistically update to processing state
                                            const rawUrl = getVariantRawUrl(variantVal);
                                            const newVV = {
                                              ...videoVariants,
                                              fullbody: {
                                                ...videoVariants.fullbody,
                                                [kit.id]: {
                                                  raw: rawUrl || '',
                                                  processed: null,
                                                  processing_state: 'processing' as const,
                                                },
                                              },
                                            };
                                            setVideoVariants(newVV);
                                            // Poll for result and auto-refresh
                                            startProcessingPoll('fullbody', kit.id, null);
                                          }
                                        }}
                                        style={{
                                          fontSize: '11px',
                                          padding: '4px 8px',
                                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                          border: 'none',
                                          color: '#fff',
                                        }}
                                      >
                                        {lineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                      </Button>
                                    )}
                                    {assetUrl && lineupReady && (
                                      <span style={{
                                        fontSize: '11px',
                                        padding: '4px 8px',
                                        color: '#10b981',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}>
                                        ✅ Lineup-ready
                                      </span>
                                    )}
                                    {assetUrl && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          if (!confirm('Weet je zeker dat je deze asset wilt verwijderen?')) return;
                                          // Clear per-kit-type fullbody
                                          const newVV = {
                                            ...videoVariants,
                                            fullbody: { ...videoVariants.fullbody },
                                          };
                                          delete newVV.fullbody[kit.id];
                                          setVideoVariants(newVV);
                                          // Also clear form.kit if home
                                          const newForm = kit.id === 'home'
                                            ? { ...form, kit: { url: '', caption: '' } }
                                            : form;
                                          if (kit.id === 'home') setForm(newForm);
                                          const updated = mergeAssetsIntoMetadata(
                                            membership?.metadata,
                                            newForm,
                                            newVV
                                          );
                                          await handleMetadataUpdate(updated);
                                        }}
                                        style={{ fontSize: '11px', padding: '4px 8px', color: '#ef4444' }}
                                      >
                                        🗑️
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Closeup Assets Grid */}
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>📸 Close-up in Tenue</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                          {effectiveKits.map((kit) => {
                            // Per-kit-type: read from videoVariants.closeup, fallback to form.closeup for home
                            const variantVal = videoVariants.closeup[kit.id]
                              || (kit.id === 'home' ? form.closeup?.url : null)
                              || null;
                            const assetUrl = getVariantDisplayUrl(variantVal);
                            const lineupReady = isLineupReady(variantVal);
                            const currentlyProcessing = isProcessing(variantVal);

                            // For fullbody reference: also handle new variant format
                            const fullbodyRef = getVariantDisplayUrl(videoVariants.fullbody[kit.id]);

                            return (
                              <div
                                key={`closeup-${kit.id}`}
                                style={{
                                  border: lineupReady
                                    ? '2px solid #10b981'
                                    : assetUrl
                                      ? '2px solid #f59e0b'
                                      : '1px solid var(--vscode-widget-border, #333)',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  background: 'var(--vscode-editor-background)',
                                }}
                              >
                                {/* Preview */}
                                <div
                                  style={{
                                    aspectRatio: '1/1',
                                    background: assetUrl
                                      ? `url(${resolveDisplayUrl(assetUrl)}) center/contain no-repeat`
                                      : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                    position: 'relative',
                                    minHeight: '150px',
                                  }}
                                >
                                  {!assetUrl && (
                                    <div style={{
                                      position: 'absolute',
                                      inset: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'var(--vscode-descriptionForeground)',
                                      fontSize: '12px',
                                    }}>
                                      Niet gegenereerd
                                    </div>
                                  )}
                                  {assetUrl && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '6px',
                                      right: '6px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      alignItems: 'flex-end',
                                    }}>
                                      <span style={{
                                        background: '#6366f1dd',
                                        color: '#fff',
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                      }}>
                                        AI
                                      </span>
                                      <ProcessingBadge value={variantVal} />
                                    </div>
                                  )}
                                  {currentlyProcessing && (
                                    <div style={{
                                      position: 'absolute',
                                      inset: 0,
                                      background: 'rgba(0,0,0,0.4)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                    }}>
                                      ⏳ Bezig met verwerken...
                                    </div>
                                  )}
                                </div>

                                {/* Label + Actions */}
                                <div style={{ padding: '10px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                                    {kit.icon} {kit.label}
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <Button
                                      size="sm"
                                      onClick={() => openAiModal('closeup_in_tenue', kit.id, fullbodyRef)}
                                      style={{ fontSize: '11px', padding: '4px 8px' }}
                                    >
                                      {assetUrl ? '🔄 Opnieuw' : '✨ Genereer'}
                                    </Button>
                                    {assetUrl && !currentlyProcessing && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={async () => {
                                          const result = await triggerAssetProcessing(
                                            apiBaseUrl, membershipId!, 'closeup', kit.id
                                          );
                                          if (result.ok) {
                                            const rawUrl = getVariantRawUrl(variantVal);
                                            const newVV = {
                                              ...videoVariants,
                                              closeup: {
                                                ...videoVariants.closeup,
                                                [kit.id]: {
                                                  raw: rawUrl || '',
                                                  processed: null,
                                                  processing_state: 'processing' as const,
                                                },
                                              },
                                            };
                                            setVideoVariants(newVV);
                                            // Poll for result and auto-refresh
                                            startProcessingPoll('closeup', kit.id, null);
                                          }
                                        }}
                                        style={{
                                          fontSize: '11px',
                                          padding: '4px 8px',
                                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                          border: 'none',
                                          color: '#fff',
                                        }}
                                      >
                                        {lineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                      </Button>
                                    )}
                                    {assetUrl && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          if (!confirm('Weet je zeker dat je deze asset wilt verwijderen?')) return;
                                          const newVV = {
                                            ...videoVariants,
                                            closeup: { ...videoVariants.closeup },
                                          };
                                          delete newVV.closeup[kit.id];
                                          setVideoVariants(newVV);
                                          const newForm = kit.id === 'home'
                                            ? { ...form, closeup: { url: '', caption: '' } }
                                            : form;
                                          if (kit.id === 'home') setForm(newForm);
                                          const updated = mergeAssetsIntoMetadata(
                                            membership?.metadata,
                                            newForm,
                                            newVV
                                          );
                                          await handleMetadataUpdate(updated);
                                        }}
                                        style={{ fontSize: '11px', padding: '4px 8px', color: '#ef4444' }}
                                      >
                                        🗑️
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Team/Club Assets Section */}
                      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--vscode-widget-border)' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>🏟️ Geërfde Team Assets</h4>
                        <p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginBottom: '16px' }}>
                          Deze assets worden geërfd van het team/seizoen en worden gebruikt als basis voor generatie.
                        </p>
                        <AssetsTab
                          level="member"
                          organisationId={String(org?.id || '')}
                          projectId={project?.id ? String(project.id) : undefined}
                          parentProjectId={club?.id ? String(club.id) : undefined}
                          entityName={getUserDisplayName(membership)}
                          readOnly
                        />
                      </div>
                    </div>
                  </Card>
                )}

                {/* Identity Tab - Member-specific profile and role editing */}
                {activeTab === 'identity' && (
                  <div className="space-y-6">
                    <IdentityTabContent
                      membership={membership}
                      project={project}
                      apiBaseUrl={apiBaseUrl}
                      onMembershipUpdate={(updated) => setMembership(updated)}
                    />
                  </div>
                )}

                {activeTab === 'workflow' && membership && project && (
                  <WorkflowPanel
                    projectId={String(project.id)}
                    contentTypeName="projectmembership"
                    objectId={String(membership.id)}
                  />
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px' }}>Member</div>
                    <div style={{ fontSize: '13px' }}>{getUserDisplayName(membership)}</div>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Badge variant="default">Membership: {String(membership?.id || '').slice(0, 8)}…</Badge>
                      {season && <Badge variant="default">Season: {season.name}</Badge>}
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Quick links</div>
                      {seasonKeyForLinks ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <Link
                            to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`}
                            className="text-blue-600 hover:underline"
                            style={{ textDecoration: 'none' }}
                          >
                            Season squad
                          </Link>
                          <Link
                            to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=content`}
                            className="text-blue-600 hover:underline"
                            style={{ textDecoration: 'none' }}
                          >
                            Season content
                          </Link>
                        </div>
                      ) : (
                        <div style={{ opacity: 0.7, fontSize: '13px' }}>Season link unavailable.</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </PageContent>
      </div>

      {/* Mobile sticky action bar */}
      {!loading && !error && membership && userCanEditProject && (
        <div className="mobile-action-bar show-mobile-only">
          <Button
            variant="primary"
            onClick={save}
            disabled={saving}
            style={{ flex: 2 }}
          >
            {saving ? 'Saving…' : '💾 Save'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (!seasonKeyForLinks) return;
              navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`);
            }}
            style={{ flex: 1 }}
          >
            ← Squad
          </Button>
        </div>
      )}

      {/* AI Asset Generation Modal */}
      <AssetGenerationModal
        isOpen={showAiModal}
        onClose={() => {
          setShowAiModal(false);
          setAiSelectedKitUrl(null);
          setAiInputPersonUrl(null);
          setAiSelectedStyleVariant(null);
        }}
        context="member"
        preSelectedTemplate={aiPreselectedTemplate}
        projectId={clubId || ''}
        organisationId={String(org?.id || '')}
        membershipId={membershipId}
        inputAssets={{
          logo: clubBrand.getAsset?.('logo_upload')
            ? getAssetUrl(clubBrand.getAsset('logo_upload')!.url)
            : null,
          sponsor: clubBrand.getAsset?.('sponsor_logo_upload')
            ? getAssetUrl(clubBrand.getAsset('sponsor_logo_upload')!.url)
            : null,
          reference: aiSelectedKitUrl,
          // For intro/celebration: use player in tenue as input, otherwise use profile photo
          person: aiInputPersonUrl
            ? getAssetUrl(aiInputPersonUrl)
            : form.profile?.url || membership?.user?.avatar_url || null,
        }}
        initialParams={{
          kit_type: aiSelectedKitType,
          // Auto-map role from kit type context
          ...(aiSelectedKitType === 'goalkeeper' ? { role: 'goalkeeper' } : {}),
          ...(aiSelectedKitType === 'coach' ? { role: 'coach' } : {}),
          ...(aiSelectedKitType === 'assistant' ? { role: 'assistant' } : {}),
          ...(aiSelectedStyleVariant ? { style_variant: aiSelectedStyleVariant } : {}),
        }}
        previousResultUrl={
          aiPreselectedTemplate === 'fullbody_in_tenue'
            ? getBestUrl(videoVariants.fullbody[aiSelectedKitType]) || form.kit?.url || null
            : aiPreselectedTemplate === 'closeup_in_tenue'
              ? getBestUrl(videoVariants.closeup[aiSelectedKitType]) || form.closeup?.url || null
              : aiPreselectedTemplate === 'member_intro' && aiSelectedStyleVariant
                ? getBestUrl(videoVariants.intro[`${aiSelectedKitType}_${aiSelectedStyleVariant}`]) || null
                : aiPreselectedTemplate === 'member_goal_celebration' && aiSelectedStyleVariant
                  ? getBestUrl(videoVariants.celebration[`${aiSelectedKitType}_${aiSelectedStyleVariant}`]) || null
                  : null
        }
        onAssetSaved={async (savedInfo) => {
          // Capture membershipId from URL params at call time — never rely on
          // `membership` state which may still hold the previous member's data
          // when the user navigated between member pages (stale closure risk).
          const saveMembershipId = membershipId;
          console.log('🎯 onAssetSaved called:', {
            savedInfo,
            saveMembershipId,
            aiSelectedKitType,
            aiSelectedStyleVariant,
          });
          if (!saveMembershipId) {
            console.error('❌ onAssetSaved: no membershipId from URL — cannot save metadata safely');
            return;
          }
          setShowAiModal(false);

          if (savedInfo?.storagePath || savedInfo?.presignedUrl) {
            const assetType = savedInfo.assetType;
            // Prefer storagePath (permanent S3 key) over presignedUrl (expires after 1h)
            const savedUrl = savedInfo.storagePath || savedInfo.presignedUrl || '';

            // Eagerly cache the presigned URL for immediate display
            if (savedInfo.storagePath && savedInfo.presignedUrl) {
              setPresignedCache((prev) => ({
                ...prev,
                [savedInfo.storagePath!]: savedInfo.presignedUrl!,
              }));
            }

            const isFullbody = assetType.startsWith('member_in_tenue');
            const isCloseup = assetType.startsWith('member_closeup');
            const isIntroVideo = assetType.startsWith('member_intro');
            const isCelebrationVideo = assetType.startsWith('member_goal_celebration');

            // Extract kit type from assetType suffix (e.g. member_in_tenue_away → away)
            const kitTypeFromAsset =
              isFullbody ? assetType.replace('member_in_tenue_', '').replace('member_in_tenue', '') || aiSelectedKitType :
              isCloseup ? assetType.replace('member_closeup_', '').replace('member_closeup', '') || aiSelectedKitType :
              aiSelectedKitType;
            const effectiveKitType = kitTypeFromAsset || 'home';

            if (isFullbody || isCloseup) {
              // Per-kit-type image storage
              const category = isFullbody ? 'fullbody' : 'closeup';
              console.log(`🎯 Saving image: ${category}.${effectiveKitType} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                [category]: {
                  ...videoVariants[category],
                  [effectiveKitType]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              // Also update the primary form slot (home → kit/closeup for backwards compat)
              const slotId: keyof MemberMediaForm = isFullbody ? 'kit' : 'closeup';
              const newForm = effectiveKitType === 'home'
                ? { ...form, [slotId]: { url: savedUrl, caption: '' } }
                : form; // Only update form.kit for home kit (legacy compat)
              if (effectiveKitType === 'home') setForm(newForm);

              const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVariants);
              await handleMetadataUpdate(updatedMeta, saveMembershipId);

            } else if ((isIntroVideo || isCelebrationVideo) && aiSelectedStyleVariant) {
              // Per-kit + per-variant video storage (composite key: kitType_styleVariant)
              const category = isIntroVideo ? 'intro' : 'celebration';
              const compositeKey = `${effectiveKitType}_${aiSelectedStyleVariant}`;
              console.log(`🎯 Saving video variant: ${category}.${compositeKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                [category]: {
                  ...videoVariants[category],
                  [compositeKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              const slotId = isIntroVideo ? 'intro' : 'celebration';
              const newForm = { ...form, [slotId]: { url: savedUrl, caption: '' } };
              setForm(newForm);

              const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVariants);
              await handleMetadataUpdate(updatedMeta, saveMembershipId);
            }
          }
        }}
      />

      {/* Video Preview Modal (click-to-enlarge) */}
      {videoPreviewUrl && (
        <div
          onClick={() => setVideoPreviewUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '400px',
              maxHeight: '90vh',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <video
              src={videoPreviewUrl}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
              controls
              autoPlay
              loop
              playsInline
            />
            <button
              onClick={() => setVideoPreviewUrl(null)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
