import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { useAuth } from '@django-core/auth-ui';
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
import { AssetsTab } from '../../components/AssetsTab';
import { AssetGenerationModal, type SavedAssetInfo } from '../../components/AssetGenerationModal';
import { getAssetUrl, resolvePresignedUrls } from '../../hooks/useBrandProfile';
import { useGenerationJobs } from '../../hooks/useGenerationJobs';
import MobileTabBar from '../../components/MobileTabBar';
import { WorkflowPanel } from '../../components/Workflows';
import { useSeasonContext } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { getCsrfToken, unwrapEnvelope as unwrap } from '../../types/season';
import s from './ProjectSeasonMemberDetailPage.module.css';

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
  halfbody: AssetVariants;  // same pattern (head to waist crop)
  closeup: AssetVariants;   // same pattern
  // Per-style-variant videos
  intro: AssetVariants;
  celebration: AssetVariants;
  // Then vs Now videos
  then_vs_now: AssetVariants; // { sidebyside: "s3://...", transformation: "..." }
  // Photo composite (Gemini image + MiniMax video)
  photo_composite: AssetVariants; // images: { default: { raw, processed } }, videos: { default: { raw, processed } }
  // Walking composite (far + near images + walking video)
  walking_composite: AssetVariants;
  // Action photo (dynamic action shots)
  action_photo: AssetVariants;
};

// Keep old name as alias for backwards compatibility within file
type VideoVariantsMap = AssetVariantsMap;

function createEmptyVideoVariants(): AssetVariantsMap {
  return { fullbody: {}, halfbody: {}, closeup: {}, intro: {}, celebration: {}, then_vs_now: {}, photo_composite: {}, walking_composite: {}, action_photo: {} };
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

  // Fall back to user avatar for profile photo
  const avatarUrl = (membership as any)?.user?.avatar_url;
  if (!form.profile.url && avatarUrl) {
    form.profile.url = String(avatarUrl).trim();
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
    halfbody: safeObj(images?.halfbody),
    closeup: safeObj(images?.closeup),
    intro: migrateVideoKeys(safeObj(videos?.intro)),
    celebration: migrateVideoKeys(safeObj(videos?.celebration)),
    then_vs_now: safeObj(videos?.then_vs_now),
    // Photo composite merges images (Gemini composite) + videos (MiniMax video)
    photo_composite: {
      ...safeObj(images?.photo_composite),  // gemini_composite key from images
      ...safeObj(videos?.photo_composite),  // default key from videos
    },
    // Walking composite merges images (far + near) + videos (walking video)
    walking_composite: {
      ...safeObj(images?.walking_composite),  // far + near keys from images
      ...safeObj(videos?.walking_composite),  // default key from videos
    },
    // Action photo (dynamic action shots, stored in images)
    action_photo: safeObj(images?.action_photo),
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
      halfbody: videoVariants.halfbody || {},
      closeup: videoVariants.closeup || {},
      action_photo: videoVariants.action_photo || {},
    };
    next.videos = {
      intro: videoVariants.intro || {},
      celebration: videoVariants.celebration || {},
      then_vs_now: videoVariants.then_vs_now || {},
      photo_composite: videoVariants.photo_composite || {},
      walking_composite: videoVariants.walking_composite || {},
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
  force?: boolean,
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
        force: force || false,
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
  const isImage = assetType === 'fullbody' || assetType === 'halfbody' || assetType === 'closeup';
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

  // Polling timed out — force-cancel the stale processing state so UI unsticks.
  if (!abortSignal?.aborted) {
    try {
      const csrfToken = getCsrfToken();
      const cancelRes = await fetch(`${apiBaseUrl}/api/v1/video/jobs/cancel-asset-processing/`, {
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
          force: true,
        }),
      });
      if (cancelRes.ok) {
        // Refresh membership to pick up cancelled state
        const memberRes = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(membershipId)}/`,
          { credentials: 'include' }
        );
        if (memberRes.ok) {
          const json = await memberRes.json();
          setMembershipFn(json?.data || json);
        }
      }
    } catch {
      // Best-effort cleanup
    }
  }
}

/**
 * Small badge component for processing state.
 */
function ProcessingBadge({ value }: { value: AssetVariantRaw | null | undefined }) {
  const normalized = normalizeVariantValue(value as any);
  if (!normalized) return null;

  // Detect false 'processed' state: if processed URL equals raw URL,
  // no actual background removal happened — show as 'raw' instead.
  let effectiveState = normalized.processing_state;
  if (effectiveState === 'processed' && normalized.processed && normalized.processed === normalized.raw) {
    effectiveState = 'raw';
  }

  const { label, color, icon } = getProcessingStateLabel(effectiveState);
  return (
    <span className={s.processingBadge} style={{
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
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <span className={s.tabIcon}>🪪</span>
            <div className={s.tabTitle}>Identity</div>
          </div>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        <div className={s.tabDescription}>
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
            <div className={s.sectionTitle} style={{ marginBottom: '12px' }}>Profile Photo</div>
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
                    className={s.mediaCoverFill}
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
                  <div className={s.flexCenterGap8}>
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
              <div className={s.sectionTitle} style={{ marginBottom: '12px' }}>Media Profile Photo</div>
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
                    className={s.mediaCoverFill}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div className={s.formLabel} style={{ marginBottom: '8px' }}>
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
          <div className={s.sectionDivider}>
            <div className={s.sectionTitle} style={{ marginBottom: '12px' }}>User Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div className={s.formLabel}>Name</div>
                <div className={s.fieldValue}>{getUserDisplayName(membership)}</div>
              </div>
              <div>
                <div className={s.formLabel}>Email</div>
                <div className={s.fieldValue}>{membership?.user?.email || '—'}</div>
              </div>
              <div>
                <div className={s.formLabel}>User ID</div>
                <div className={s.monoId}>{membership?.user?.id || '—'}</div>
              </div>
              <div>
                <div className={s.formLabel}>Membership ID</div>
                <div className={s.monoId}>{membership?.id || '—'}</div>
              </div>
            </div>
          </div>

          {/* Role/Position Section */}
          <div className={s.sectionDivider} style={{ marginTop: '20px' }}>
            <div className={s.sectionTitle} style={{ marginBottom: '12px' }}>Role & Position</div>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div className={s.formLabel}>Position</div>
                  <Input
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    placeholder="e.g., Forward, Midfielder, Goalkeeper"
                  />
                </div>
                <div>
                  <div className={s.formLabel}>Jersey Number</div>
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
                  <div className={s.formLabel}>Role</div>
                  <Badge variant="default">{membership?.role || 'member'}</Badge>
                </div>
                <div>
                  <div className={s.formLabel}>Position</div>
                  <div className={s.fieldValue}>
                    {membership?.metadata?.position || (membership as any)?.position || '—'}
                  </div>
                </div>
                <div>
                  <div className={s.formLabel}>Jersey Number</div>
                  <div className={s.fieldValue}>
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

  // ── Shared season-hierarchy data from SeasonProvider ──
  const {
    org: providerOrg,
    project: providerProject,
    club: providerClub,
    season: providerSeason,
    resolvedSeasonId: providerSeasonId,
    loading: providerLoading,
    error: providerError,
    isTeamRoute,
    isOrgRoute: isOrgRoutes,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId: seasonKeyOrId,
    seasonsBasePath,
    seasonPathKey: seasonKeyForLinksFromProvider,
    clubBrand,
    teamBrand,
    batchBrandKits,
    isSuperAdmin,
    orgForPermissions,
    permissionContext,
    userCanEditProject,
    isPlayer,
    apiBaseUrl,
  } = useSeasonContext();

  // membershipId comes from the competitionId route param (UUID member id)
  const membershipId = String((params as any).competitionId || '').trim();

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

  // ── Local shadow state synced from provider (allows optimistic updates) ──
  const [loading, setLoading] = useState(providerLoading);
  const [error, setError] = useState<string | null>(providerError);
  const [org, setOrg] = useState<Organisation | null>(providerOrg);
  const [project, setProject] = useState<Project | null>(providerProject);
  const [club, setClub] = useState<Project | null>(providerClub);
  const [season, setSeason] = useState<Period | null>(providerSeason);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>(providerSeasonId);

  useEffect(() => { setOrg(providerOrg); }, [providerOrg]);
  useEffect(() => { setProject(providerProject); }, [providerProject]);
  useEffect(() => { setClub(providerClub); }, [providerClub]);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);
  useEffect(() => { setResolvedSeasonId(providerSeasonId); }, [providerSeasonId]);
  useEffect(() => { setLoading(providerLoading); }, [providerLoading]);
  useEffect(() => { setError(providerError); }, [providerError]);

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

  // Legacy Photo Upload State
  const legacyPhotoInputRef = useRef<HTMLInputElement>(null);
  const [legacyPhotoUploading, setLegacyPhotoUploading] = useState(false);
  const [legacyPhotoPreview, setLegacyPhotoPreview] = useState<string | null>(null);

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

  // Legacy Photo Upload Handler
  const handleLegacyPhotoUpload = async (file: File) => {
    if (!membershipId) { alert('Membership ID ontbreekt.'); return; }
    const organizationId = org?.id || (project as any)?.organisation?.id;
    if (!organizationId) { alert('Organization ID ontbreekt.'); return; }
    setLegacyPhotoUploading(true);
    setLegacyPhotoPreview(URL.createObjectURL(file));
    try {
      const csrfToken = getCsrfToken();

      // Step 1: Upload file to storage via files API
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path_prefix', `members/${membershipId}/media/legacy_photo`);

      const uploadRes = await fetch(`${apiBaseUrl}/api/v1/files/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
          'X-Organization-ID': organizationId,
        },
        body: fd,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text().catch(() => '');
        throw new Error(`Upload mislukt: ${uploadRes.status} ${errBody.slice(0, 200)}`);
      }

      const uploadData = await uploadRes.json();
      const storagePath = uploadData?.data?.storage_path || uploadData?.storage_path;
      if (!storagePath) throw new Error('Geen storage path ontvangen');

      // Step 2: Update membership metadata with storage path
      const patchRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({
            metadata: {
              ...(membership?.metadata || {}),
              teamreel_assets: {
                ...((membership?.metadata as any)?.teamreel_assets || {}),
                media: {
                  ...((membership?.metadata as any)?.teamreel_assets?.media || {}),
                  legacy_photo: {
                    url: storagePath,
                    caption: '',
                  },
                },
              },
            },
          }),
        }
      );

      if (!patchRes.ok) {
        throw new Error(`Metadata update failed: ${patchRes.status}`);
      }

      // Step 3: Add to presigned cache for immediate display
      const uploadedPresignedUrl = uploadData?.data?.presigned_url || uploadData?.presigned_url;
      if (uploadedPresignedUrl) {
        setPresignedCache((prev) => ({ ...prev, [storagePath]: uploadedPresignedUrl }));
      }

      // Step 4: Refresh membership data
      const memberRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`,
        { credentials: 'include' }
      );
      if (memberRes.ok) {
        const json = await memberRes.json();
        setMembership(json?.data || json);
      }

      // Clear preview to show resolved URL from metadata
      setLegacyPhotoPreview(null);
      alert('Legacy foto succesvol geüpload!');
    } catch (err) {
      console.error('Legacy photo upload error:', err);
      alert(err instanceof Error ? err.message : 'Upload mislukt');
    } finally {
      setLegacyPhotoUploading(false);
    }
  };

  // Closeup from fullbody crop
  const [croppingCloseup, setCroppingCloseup] = useState<Record<string, boolean>>({});

  const cropCloseupFromFullbody = async (kitType: string) => {
    if (!membershipId) {
      alert('Membership ID ontbreekt.');
      return;
    }
    setCroppingCloseup((prev) => ({ ...prev, [kitType]: true }));
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/crop-closeup/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ membership_id: membershipId, kit_type: kitType }),
      });

      const raw = await res.json();
      const inner = (raw.data ?? raw) as Record<string, string>;

      if (!res.ok) {
        throw new Error(inner?.error || raw?.error || `Server error ${res.status}`);
      }

      const storagePath: string = inner.storage_path || '';
      if (!storagePath) throw new Error('Geen storage pad ontvangen van de server');

      // Set as proper variant object so the presigning useEffect picks it up
      setVideoVariants((prev) => ({
        ...prev,
        closeup: {
          ...prev.closeup,
          [kitType]: { raw: storagePath, processed: storagePath, processing_state: 'processed' as const },
        },
      }));

    } catch (err) {
      console.error('Closeup crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingCloseup((prev) => ({ ...prev, [kitType]: false }));
    }
  };

  // Halfbody from fullbody crop
  const [croppingHalfbody, setCroppingHalfbody] = useState<Record<string, boolean>>({});

  const cropHalfbodyFromFullbody = async (kitType: string) => {
    if (!membershipId) {
      alert('Membership ID ontbreekt.');
      return;
    }
    setCroppingHalfbody((prev) => ({ ...prev, [kitType]: true }));
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/crop-halfbody/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ membership_id: membershipId, kit_type: kitType }),
      });

      const raw = await res.json();
      const inner = (raw.data ?? raw) as Record<string, string>;

      if (!res.ok) {
        throw new Error(inner?.error || raw?.error || `Server error ${res.status}`);
      }

      const storagePath: string = inner.storage_path || '';
      if (!storagePath) throw new Error('Geen storage pad ontvangen van de server');

      // Set as proper variant object so the presigning useEffect picks it up
      setVideoVariants((prev) => ({
        ...prev,
        halfbody: {
          ...prev.halfbody,
          [kitType]: { raw: storagePath, processed: storagePath, processing_state: 'processed' as const },
        },
      }));

    } catch (err) {
      console.error('Halfbody crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingHalfbody((prev) => ({ ...prev, [kitType]: false }));
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

  // Brand profiles come from SeasonProvider (clubBrand, teamBrand, batchBrandKits)
  // Get effective kits — built from provider's batchBrandKits
  const effectiveKits = useMemo(() => {
    const KIT_ROLE_META: { id: string; label: string; icon: string }[] = [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'away', label: 'Away', icon: '✈️' },
      { id: 'third', label: 'Third', icon: '3️⃣' },
      { id: 'keeper', label: 'Keeper', icon: '🧤' },
    ];
    return KIT_ROLE_META.map(role => ({
      id: role.id,
      label: role.label,
      icon: role.icon,
      url: batchBrandKits[role.id] ?? null,
    }));
  }, [batchBrandKits]);

  // Handler to open AI modal for a specific template
  const openAiModal = (templateId: string, defaultKitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null, referenceOverride?: string | null) => {
    setAiPreselectedTemplate(templateId);
    const kitType = defaultKitType || 'home';
    setAiSelectedKitType(kitType);
    // Find the kit URL for the selected type
    const kit = effectiveKits.find(k => k.id === kitType);
    setAiSelectedKitUrl(referenceOverride || kit?.url || null);
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
    for (const category of ['fullbody', 'halfbody', 'closeup', 'intro', 'celebration', 'then_vs_now', 'photo_composite', 'walking_composite'] as const) {
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
   * Uses presigned URL cache for S3 keys.  Returns null if not yet resolved
   * (never falls back to unsigned direct S3 URLs which 403 on private buckets).
   */
  const resolveDisplayUrl = useCallback((storagePath: string | null | undefined): string | null => {
    if (!storagePath) return null;
    if (storagePath.startsWith('http')) return storagePath;
    // Check presigned cache — return null while awaiting resolution
    return presignedCache[storagePath] || null;
  }, [presignedCache]);

  // ── Reset membership state immediately when navigating to a different member ──
  // Without this, `membership` still holds the previous member's data during the
  // async fetch, creating a window where the AI modal callback writes to the
  // wrong member's metadata (stale-closure bug).
  useEffect(() => {
    setMembership(null);
  }, [membershipId]);

  // ── Fetch member data (org/project/club/season come from SeasonProvider) ──
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!project?.id || !membershipId) return;
        if (!UUID_RE.test(membershipId)) {
          setError('Member id must be a UUID');
          return;
        }

        const memberRes = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(membershipId)}/`,
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
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, project?.id, membershipId]);

  const seasonKeyForLinks = seasonKeyForLinksFromProvider || resolvedSeasonId;

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

  // Players can only view their own member profile
  const isOwnProfile = membership && user && String((membership as any)?.user?.id ?? '') === String((user as any)?.id ?? '');
  if (isPlayer && !loading && membership && !isOwnProfile) {
    return (
      <AppShell>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--app-text)' }}>Geen toegang</h2>
          <p style={{ color: 'var(--app-text-secondary)', margin: '0 0 24px' }}>
            Je kunt alleen je eigen profiel bekijken.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Ga terug
          </button>
        </div>
      </AppShell>
    );
  }

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
            {!isPlayer && (
            <Button
              variant="secondary"
              onClick={() => {
                if (!seasonKeyForLinks) return;
                navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`);
              }}
            >
              Back to squad
            </Button>
            )}
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
          { id: 'input', label: 'Input Foto\'s' },
          { id: 'assets', label: 'Assets' },
          { id: 'intro', label: 'Short Intro' },
          { id: 'celebration', label: 'Celebration' },
          { id: 'then_vs_now', label: 'Transformation' },
          { id: 'photo_composite', label: 'Duo Portret' },
          { id: 'walking_composite', label: 'Walking Composite' },
          { id: 'action_photo', label: 'Actiefoto' },
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
                  <div className={s.activeJobsBanner}>
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
                {activeTab === 'overview' && (() => {
                  // Phase-based overview that maps to new tab structure
                  const inputItems = [
                    { key: 'profile', icon: '👤', label: 'Profielfoto', tab: 'input', hasContent: Boolean(form.profile?.url) },
                    { key: 'legacy_photo', icon: '📸', label: 'Legacy Foto', tab: 'input', hasContent: Boolean(form.legacy_photo?.url) },
                  ];
                  const hasVariantContent = (v: unknown): boolean => {
                    if (!v) return false;
                    if (typeof v === 'string') return true;
                    if (typeof v === 'object' && v !== null) {
                      const obj = v as Record<string, unknown>;
                      return Boolean(obj.raw || obj.processed);
                    }
                    return false;
                  };
                  const hasLegacyFullbody = hasVariantContent(videoVariants.fullbody?.legacy);
                  const assetItems = [
                    { key: 'kit', icon: '👕', label: 'In Tenue', tab: 'assets', hasContent: Boolean(form.kit?.url) },
                    { key: 'closeup', icon: '🔍', label: 'Close-up', tab: 'assets', hasContent: Boolean(form.closeup?.url) },
                    { key: 'legacy', icon: '🏆', label: 'Legacy in Tenue', tab: 'assets', hasContent: Boolean(form.legacy?.url) || hasLegacyFullbody },
                  ];
                  const hasAnyIntro = Object.values(videoVariants.intro || {}).some(hasVariantContent);
                  const hasAnyCelebration = Object.values(videoVariants.celebration || {}).some(hasVariantContent);
                  const hasAnyThenVsNow = Object.values(videoVariants.then_vs_now || {}).some(hasVariantContent);
                  const hasAnyDuoPortret = Object.values(videoVariants.photo_composite || {}).some(hasVariantContent);
                  const hasAnyWalking = Object.values(videoVariants.walking_composite || {}).some(hasVariantContent);
                  const hasAnyActionPhoto = Object.values(videoVariants.action_photo || {}).some(hasVariantContent);
                  const videoItems = [
                    { key: 'intro', icon: '🎬', label: 'Short Intro', tab: 'intro', hasContent: hasAnyIntro },
                    { key: 'celebration', icon: '🎉', label: 'Celebration', tab: 'celebration', hasContent: hasAnyCelebration },
                    { key: 'then_vs_now', icon: '⏳', label: 'Transformation', tab: 'then_vs_now', hasContent: hasAnyThenVsNow },
                    { key: 'duo_portret', icon: '👥', label: 'Duo Portret', tab: 'photo_composite', hasContent: hasAnyDuoPortret },
                    { key: 'walking', icon: '🚶', label: 'Walking Composite', tab: 'walking_composite', hasContent: hasAnyWalking },
                    { key: 'action_photo', icon: '⚡', label: 'Actiefoto', tab: 'action_photo', hasContent: hasAnyActionPhoto },
                  ];
                  const allItems = [...inputItems, ...assetItems, ...videoItems];
                  const completedCount = allItems.filter(i => i.hasContent).length;
                  const totalCount = allItems.length;

                  const renderPhase = (title: string, emoji: string, items: typeof inputItems) => (
                    <div style={{ marginBottom: '20px' }}>
                      <div className={s.flexCenterGap8} style={{ marginBottom: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{emoji}</span>
                        <div className={s.sectionTitle}>{title}</div>
                        <div style={{ fontSize: '12px', opacity: 0.6 }}>
                          {items.filter(i => i.hasContent).length}/{items.length}
                        </div>
                      </div>
                      <div className={s.overviewGrid}>
                        {items.map(item => (
                          <div
                            key={item.key}
                            onClick={() => navigateToTab(item.tab)}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              border: `1px solid ${item.hasContent ? '#10b981' : 'var(--app-border)'}`,
                              background: item.hasContent ? 'rgba(16, 185, 129, 0.08)' : 'var(--app-surface)',
                              cursor: 'pointer',
                              transition: 'border-color 0.15s',
                            }}
                          >
                            <div className={s.flexCenterGap8}>
                              <span style={{ fontSize: '18px' }}>{item.icon}</span>
                              <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.label}</span>
                              <span style={{ marginLeft: 'auto', fontSize: '13px' }}>
                                {item.hasContent ? '✅' : '⬜'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );

                  return (
                  <Card>
                    <div className={s.cardPadding}>
                      <div className={s.flexSpaceBetween}>
                        <div className={s.tabTitle}>Overzicht</div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div className={s.tabDescription}>
                        Status per fase: welke assets zijn geüpload of gegenereerd.
                      </div>

                      <div style={{ marginTop: '16px' }}>
                        {renderPhase('📥 Input Foto\'s', '📥', inputItems)}
                        {renderPhase('🖼️ Gegenereerde Assets', '🖼️', assetItems)}
                        {renderPhase('🎬 Video Content', '🎬', videoItems)}
                      </div>

                      <div className={s.progressBar}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          Voortgang: {completedCount} / {totalCount} assets
                        </div>
                        <div style={{ marginTop: '8px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(completedCount / totalCount) * 100}%`,
                              background: completedCount === totalCount ? '#10b981' : '#3b82f6',
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                  );
                })()}

                {/* Input Photos tab — Profile + Legacy side by side */}
                {activeTab === 'input' && (
                  <Card>
                    <div className={s.cardPadding}>
                      <div className={s.flexSpaceBetween}>
                        <div className={s.flexCenterGap8}>
                          <span className={s.tabIcon}>📷</span>
                          <div className={s.tabTitle}>Input Foto's</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>
                      <div className={s.tabDescription}>
                        Upload de bronfotos die als input worden gebruikt voor alle AI-generaties.
                      </div>

                      <div className={s.inputPhotoGrid}>
                        {/* Profile Photo */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>📷 Profielfoto</div>
                          <div className={s.photoThumbnailSquare}>
                            {(profilePreview || form.profile?.url || membership?.user?.avatar_url) ? (
                              <img
                                src={profilePreview || form.profile?.url || membership?.user?.avatar_url}
                                alt={getUserDisplayName(membership)}
                                className={s.mediaCoverFill}
                                style={{ opacity: profileUploading ? 0.5 : 1 }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div style={{ fontSize: '48px', opacity: 0.3 }}>👤</div>
                            )}
                          </div>
                          {(profilePreview || form.profile?.url || membership?.user?.avatar_url) && (
                            <div style={{ fontSize: '11px', color: '#28a745', fontWeight: 600, marginBottom: '8px' }}>✓ Ingesteld</div>
                          )}
                          <div
                            onClick={() => userCanEditProject && !profileUploading && profileInputRef.current?.click()}
                            className={s.uploadDropZone}
                            style={{
                              opacity: userCanEditProject ? 1 : 0.5,
                              cursor: userCanEditProject && !profileUploading ? 'pointer' : 'default',
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
                              <div style={{ fontSize: '12px', fontWeight: 600 }}>⏳ Uploaden...</div>
                            ) : (
                              <>
                                <div style={{ fontSize: '24px', marginBottom: '4px' }}>📤</div>
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>Upload / Vervang</div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Legacy Photo */}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>📸 Legacy Foto</div>
                          <div className={s.photoThumbnailSquare}>
                            {(legacyPhotoPreview || form.legacy_photo?.url) ? (
                              <img
                                src={legacyPhotoPreview || resolveDisplayUrl(form.legacy_photo?.url) || undefined}
                                alt="Legacy Photo"
                                className={s.mediaCoverFill}
                                style={{ opacity: legacyPhotoUploading ? 0.5 : 1 }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div style={{ fontSize: '48px', opacity: 0.3 }}>📸</div>
                            )}
                          </div>
                          {(legacyPhotoPreview || form.legacy_photo?.url) && (
                            <div style={{ fontSize: '11px', color: '#28a745', fontWeight: 600, marginBottom: '8px' }}>✓ Ingesteld</div>
                          )}
                          <div
                            onClick={() => userCanEditProject && !legacyPhotoUploading && legacyPhotoInputRef.current?.click()}
                            className={s.uploadDropZone}
                            style={{
                              opacity: userCanEditProject ? 1 : 0.5,
                              cursor: userCanEditProject && !legacyPhotoUploading ? 'pointer' : 'default',
                            }}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!userCanEditProject || legacyPhotoUploading) return;
                              const file = e.dataTransfer.files?.[0];
                              if (file && file.type.startsWith('image/')) handleLegacyPhotoUpload(file);
                            }}
                          >
                            <input
                              ref={legacyPhotoInputRef}
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleLegacyPhotoUpload(file);
                                e.target.value = '';
                              }}
                            />
                            {legacyPhotoUploading ? (
                              <div style={{ fontSize: '12px', fontWeight: 600 }}>⏳ Uploaden...</div>
                            ) : (
                              <>
                                <div style={{ fontSize: '24px', marginBottom: '4px' }}>📤</div>
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>Upload / Vervang</div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {!userCanEditProject && (
                        <div className={s.permissionAlert}>
                          <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
                        </div>
                      )}
                    </div>
                  </Card>
                )}




                {/* Short Intro Tab - AI Generated Video Variants */}
                {activeTab === 'intro' && (
                  <Card>
                    <div className={s.cardPadding}>
                      <div className={s.flexSpaceBetween}>
                        <div className={s.flexCenterGap8}>
                          <span className={s.tabIcon}>🎬</span>
                          <div className={s.tabTitle}>Short Intro</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div className={s.tabDescription}>
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
                          <div key={`intro-kit-${kit.id}`} className={s.kitSectionMargin}>
                            <div className={s.flexCenterGap8} style={{ marginBottom: '12px' }}>
                              {kit.url ? (
                                <img
                                  src={kit.url}
                                  alt={kit.label}
                                  className={s.kitIconImg}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <span style={{ fontSize: '20px' }}>{kit.icon}</span>
                              )}
                              <div className={s.sectionTitle}>{kit.label}</div>
                              {hasPlayerInTenue && (
                                <Badge variant="default" style={{ marginLeft: 'auto' }}>✓ Player in Tenue</Badge>
                              )}
                              {!hasPlayerInTenue && (
                                <Badge variant="info" style={{ marginLeft: 'auto' }}>⚠️ Genereer eerst Player in Tenue</Badge>
                              )}
                            </div>

                            <div className={s.variantGrid} style={{ opacity: hasPlayerInTenue ? 1 : 0.5 }}>
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
                                  <div key={variant.id} className={s.variantCard} style={{
                                    border: hasVideo ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                                  }}>
                                    <div
                                      onClick={() => { if (resolvedUrl) setVideoPreviewUrl(resolvedUrl); }}
                                      className={s.variantPreview916}
                                      style={{
                                        background: (hasVideo && !variantLineupReady)
                                          ? '#000'
                                          : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                        cursor: hasVideo ? 'pointer' : 'default',
                                      }}>
                                      {hasVideo && resolvedUrl ? (
                                        <>
                                          <video
                                            key={resolvedUrl}
                                            src={resolvedUrl}
                                            className={s.mediaCoverContain}
                                            muted
                                            loop
                                            playsInline
                                            autoPlay
                                            onError={(e) => {
                                              (e.target as HTMLVideoElement).style.display = 'none';
                                            }}
                                          />
                                          <div className={s.overlayBadgeContainer}>
                                            <div className={s.aiBadge}>
                                              AI
                                            </div>
                                            <ProcessingBadge value={variantRaw} />
                                          </div>
                                        </>
                                      ) : (
                                        <div className={s.notGeneratedText}>
                                          Niet gegenereerd
                                        </div>
                                      )}
                                    </div>
                                    <div className={s.cardFooterPadding}>
                                      <div className={s.variantLabel}>
                                        {variant.icon} {variant.label}
                                      </div>
                                      <div className={s.actionButtonRow}>
                                        {hasVideo ? (
                                          <>
                                            <Button
                                              size="sm"
                                              onClick={() => openAiModal('member_intro', kit.id, playerInTenueUrl, variant.id)}
                                              disabled={!hasPlayerInTenue}
                                              className={s.btnSmall}
                                              style={{ flex: 1 }}
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
                                                className={s.btnProcess}
                                              >
                                                {variantLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                              </Button>
                                            )}

                                            {isCancellingOrProcessing && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={async () => {
                                                  const isCancelling = normalizedVariant?.processing_state === 'cancelling';
                                                  const result = await cancelAssetProcessing(
                                                    apiBaseUrl,
                                                    membershipId!,
                                                    'intro',
                                                    kit.id,
                                                    variant.id,
                                                    isCancelling,
                                                  );
                                                  if (result.ok) {
                                                    if (isCancelling) {
                                                      try {
                                                        const memberRes = await fetch(
                                                          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(membershipId!)}/`,
                                                          { credentials: 'include' }
                                                        );
                                                        if (memberRes.ok) {
                                                          const json = await memberRes.json();
                                                          setMembership(json?.data || json);
                                                        }
                                                      } catch { /* best-effort */ }
                                                    } else {
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
                                                  }
                                                }}
                                                className={s.btnCancelOrange}
                                              >
                                                {normalizedVariant?.processing_state === 'cancelling' ? '❌ Force Cancel' : '⏹️ Cancel'}
                                              </Button>
                                            )}
                                            {variantLineupReady && (
                                              <span className={s.readyIndicator}>✓ Ready</span>
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
                                              className={s.btnDelete}
                                            >
                                              🗑️
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() => openAiModal('member_intro', kit.id, playerInTenueUrl, variant.id)}
                                            disabled={!hasPlayerInTenue}
                                            className={s.btnSmall}
                                            style={{ width: '100%' }}
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
                    <div className={s.cardPadding}>
                      <div className={s.flexSpaceBetween}>
                        <div className={s.flexCenterGap8}>
                          <span className={s.tabIcon}>🎉</span>
                          <div className={s.tabTitle}>Goal Celebration</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div className={s.tabDescription}>
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
                          <div key={`celebration-kit-${kit.id}`} className={s.kitSectionMargin}>
                            <div className={s.flexCenterGap8} style={{ marginBottom: '12px' }}>
                              {kit.url ? (
                                <img
                                  src={kit.url}
                                  alt={kit.label}
                                  className={s.kitIconImg}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <span style={{ fontSize: '20px' }}>{kit.icon}</span>
                              )}
                              <div className={s.sectionTitle}>{kit.label}</div>
                              {hasPlayerInTenue && (
                                <Badge variant="default" style={{ marginLeft: 'auto' }}>✓ Player in Tenue</Badge>
                              )}
                              {!hasPlayerInTenue && (
                                <Badge variant="info" style={{ marginLeft: 'auto' }}>⚠️ Genereer eerst Player in Tenue</Badge>
                              )}
                            </div>

                            <div className={s.variantGrid} style={{ opacity: hasPlayerInTenue ? 1 : 0.5 }}>
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
                                  <div key={variant.id} className={s.variantCard} style={{
                                    border: hasVideo ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                                  }}>
                                    <div
                                      onClick={() => { if (resolvedUrl) setVideoPreviewUrl(resolvedUrl); }}
                                      className={s.variantPreview916}
                                      style={{
                                        background: (hasVideo && !variantLineupReady)
                                          ? '#000'
                                          : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                        cursor: hasVideo ? 'pointer' : 'default',
                                      }}>
                                      {hasVideo && resolvedUrl ? (
                                        <>
                                          <video
                                            key={resolvedUrl}
                                            src={resolvedUrl}
                                            className={s.mediaCoverContain}
                                            muted
                                            loop
                                            playsInline
                                            autoPlay
                                            onError={(e) => {
                                              (e.target as HTMLVideoElement).style.display = 'none';
                                            }}
                                          />
                                          <div className={s.overlayBadgeContainer}>
                                            <div className={s.aiBadge}>
                                              AI
                                            </div>
                                            <ProcessingBadge value={variantRaw} />
                                          </div>
                                        </>
                                      ) : (
                                        <div className={s.notGeneratedText}>
                                          Niet gegenereerd
                                        </div>
                                      )}
                                    </div>
                                    <div className={s.cardFooterPadding}>
                                      <div className={s.variantLabel}>
                                        {variant.icon} {variant.label}
                                      </div>
                                      <div className={s.actionButtonRow}>
                                        {hasVideo ? (
                                          <>
                                            <Button
                                              size="sm"
                                              onClick={() => openAiModal('member_goal_celebration', kit.id, playerInTenueUrl, variant.id)}
                                              disabled={!hasPlayerInTenue}
                                              className={s.btnSmall}
                                              style={{ flex: 1 }}
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
                                                className={s.btnProcess}
                                              >
                                                {variantLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                              </Button>
                                            )}

                                            {isCancellingOrProcessing && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={async () => {
                                                  const isCancelling = normalizedVariant?.processing_state === 'cancelling';
                                                  const result = await cancelAssetProcessing(
                                                    apiBaseUrl,
                                                    membershipId!,
                                                    'celebration',
                                                    kit.id,
                                                    variant.id,
                                                    isCancelling,
                                                  );
                                                  if (result.ok) {
                                                    if (isCancelling) {
                                                      try {
                                                        const memberRes = await fetch(
                                                          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(membershipId!)}/`,
                                                          { credentials: 'include' }
                                                        );
                                                        if (memberRes.ok) {
                                                          const json = await memberRes.json();
                                                          setMembership(json?.data || json);
                                                        }
                                                      } catch { /* best-effort */ }
                                                    } else {
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
                                                  }
                                                }}
                                                className={s.btnCancelOrange}
                                              >
                                                {normalizedVariant?.processing_state === 'cancelling' ? '❌ Force Cancel' : '⏹️ Cancel'}
                                              </Button>
                                            )}
                                            {variantLineupReady && (
                                              <span className={s.readyIndicator}>✓ Ready</span>
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
                                              className={s.btnDelete}
                                            >
                                              🗑️
                                            </Button>
                                          </>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() => openAiModal('member_goal_celebration', kit.id, playerInTenueUrl, variant.id)}
                                            disabled={!hasPlayerInTenue}
                                            className={s.btnSmall}
                                            style={{ width: '100%' }}
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

                {/* Then vs Now Tab - Legacy vs Current side by side & transformation */}
                {activeTab === 'then_vs_now' && (() => {
                  // Resolve legacy in tenue URL (AI-generated legacy fullbody, NOT raw legacy photo)
                  const legacyFullbodyUrl =
                    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.legacy))
                    || null;
                  // Resolve current fullbody URL (home kit fullbody)
                  const currentFullbodyUrl =
                    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.home))
                    || resolveDisplayUrl(form.kit?.url)
                    || null;
                  const hasBothInputs = Boolean(legacyFullbodyUrl) && Boolean(currentFullbodyUrl);

                  const transformationVariantDefs = [
                    { id: 'hands_on_head', icon: '🤯', label: 'Handen op hoofd' },
                    { id: 'spin', icon: '🔄', label: '360° Spin' },
                    { id: 'clap', icon: '👏', label: 'Klap' },
                    { id: 'jersey_pull', icon: '👕', label: 'Shirt trekken' },
                    { id: 'arms_wide', icon: '🙌', label: 'Armen wijd' },
                    { id: 'fist_pump', icon: '✊', label: 'Vuist omhoog' },
                    { id: 'snap', icon: '🫰', label: 'Vingerknip' },
                  ];

                  return (
                    <Card>
                      <div className={s.cardPadding}>
                        <div className={s.flexSpaceBetween}>
                          <div className={s.flexCenterGap8}>
                            <span className={s.tabIcon}>⏳</span>
                            <div className={s.tabTitle}>Transformation</div>
                          </div>
                          <Badge variant={userCanEditProject ? 'default' : 'info'}>
                            {userCanEditProject ? 'Editable' : 'Read-only'}
                          </Badge>
                        </div>

                        <div className={s.tabDescription}>
                          Vergelijk de speler vroeger en nu. Vereist zowel een &quot;Legacy in Tenue&quot; als een huidige &quot;Player in Tenue&quot; afbeelding.
                        </div>

                        {/* Prerequisites check */}
                        <div className={s.prerequisiteRow}>
                          <div className={s.prerequisiteCard} style={{
                            border: legacyFullbodyUrl ? '2px solid var(--vscode-charts-green)' : '1px dashed var(--app-border)',
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>🏆 Legacy in Tenue</div>
                            {legacyFullbodyUrl ? (
                              <img
                                src={legacyFullbodyUrl}
                                alt="Legacy in Tenue"
                                className={s.prereqThumbnail}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div style={{ color: 'var(--app-text-muted)', fontSize: '11px' }}>⚠️ Genereer eerst een Legacy in Tenue</div>
                            )}
                          </div>
                          <div className={s.prerequisiteCard} style={{
                            border: currentFullbodyUrl ? '2px solid var(--vscode-charts-green)' : '1px dashed var(--app-border)',
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>👕 Huidige Fullbody</div>
                            {currentFullbodyUrl ? (
                              <img
                                src={currentFullbodyUrl}
                                alt="Current"
                                className={s.prereqThumbnail}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div style={{ color: 'var(--app-text-muted)', fontSize: '11px' }}>⚠️ Genereer eerst Player in Tenue</div>
                            )}
                          </div>
                        </div>

                        {/* Transformation variants */}
                        <div style={{ marginTop: '28px' }}>
                          <div className={s.flexCenterGap8} style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '20px' }}>🔄</span>
                            <div className={s.sectionTitle}>Transformatie</div>
                            <div style={{ fontSize: '11px', opacity: 0.6, marginLeft: '4px' }}>4 sec — legacy verandert in huidige speler</div>
                          </div>
                          <div className={s.variantGrid} style={{ opacity: hasBothInputs ? 1 : 0.5 }}>
                            {transformationVariantDefs.map((variant) => {
                              const compositeKey = `transformation_${variant.id}`;
                              // Also check legacy key (just "transformation") for backwards compat
                              const variantRaw = videoVariants.then_vs_now[compositeKey] || (variant.id === 'hands_on_head' ? videoVariants.then_vs_now.transformation : undefined);
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
                                <div key={variant.id} className={s.variantCard} style={{
                                  border: hasVideo ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                                }}>
                                  <div
                                    onClick={() => { if (resolvedUrl) setVideoPreviewUrl(resolvedUrl); }}
                                    className={s.variantPreview916}
                                    style={{
                                      background: (hasVideo && !variantLineupReady)
                                        ? '#000'
                                        : undefined,
                                      cursor: hasVideo ? 'pointer' : 'default',
                                    }}>
                                    {hasVideo && resolvedUrl ? (
                                      <>
                                        <video
                                          key={resolvedUrl}
                                          src={resolvedUrl}
                                          className={s.mediaCoverContain}
                                          muted
                                          loop
                                          playsInline
                                          autoPlay
                                          onError={(e) => {
                                            (e.target as HTMLVideoElement).style.display = 'none';
                                          }}
                                        />
                                        <div className={s.overlayBadgeContainer}>
                                          <div className={s.aiBadge}>
                                            AI
                                          </div>
                                          <ProcessingBadge value={variantRaw} />
                                        </div>
                                      </>
                                    ) : (
                                      <div className={s.notGeneratedText}>
                                        {variant.icon}<br />Niet gegenereerd
                                      </div>
                                    )}
                                  </div>
                                  <div className={s.cardFooterPadding}>
                                    <div className={s.variantLabel}>
                                      {variant.icon} {variant.label}
                                    </div>
                                    <div className={s.actionButtonRow}>
                                      {hasVideo ? (
                                        <>
                                          <Button
                                            size="sm"
                                            onClick={() => openAiModal('then_vs_now_transformation', 'home', legacyFullbodyUrl, variant.id, currentFullbodyUrl)}
                                            disabled={!hasBothInputs}
                                            className={s.btnSmall}
                                            style={{ flex: 1 }}
                                          >
                                            Opnieuw
                                          </Button>
                                          {!variantProcessing && (
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              onClick={async () => {
                                                const result = await triggerAssetProcessing(
                                                  apiBaseUrl, membershipId!, 'then_vs_now', 'transformation', variant.id
                                                );
                                                if (result.ok) {
                                                  const rawUrl = getVariantRawUrl(variantRaw) || '';
                                                  const newVV: VideoVariantsMap = {
                                                    ...videoVariants,
                                                    then_vs_now: {
                                                      ...videoVariants.then_vs_now,
                                                      [compositeKey]: {
                                                        raw: rawUrl,
                                                        processed: null,
                                                        processing_state: 'processing' as const,
                                                      },
                                                    },
                                                  };
                                                  setVideoVariants(newVV);
                                                  startProcessingPoll('then_vs_now', 'transformation', variant.id);
                                                }
                                              }}
                                              className={s.btnProcess}
                                            >
                                              {variantLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                            </Button>
                                          )}

                                          {isCancellingOrProcessing && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={async () => {
                                                const isCancelling = normalizedVariant?.processing_state === 'cancelling';
                                                const result = await cancelAssetProcessing(
                                                  apiBaseUrl, membershipId!, 'then_vs_now', 'transformation', variant.id, isCancelling
                                                );
                                                if (result.ok) {
                                                  if (isCancelling) {
                                                    try {
                                                      const memberRes = await fetch(
                                                        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(membershipId!)}/`,
                                                        { credentials: 'include' }
                                                      );
                                                      if (memberRes.ok) {
                                                        const json = await memberRes.json();
                                                        setMembership(json?.data || json);
                                                      }
                                                    } catch { /* best-effort */ }
                                                  } else {
                                                    const rawUrl = getVariantRawUrl(variantRaw) || '';
                                                    const newVV: VideoVariantsMap = {
                                                      ...videoVariants,
                                                      then_vs_now: {
                                                        ...videoVariants.then_vs_now,
                                                        [compositeKey]: {
                                                          raw: rawUrl,
                                                          processed: null,
                                                          processing_state: 'cancelling' as const,
                                                        },
                                                      },
                                                    };
                                                    setVideoVariants(newVV);
                                                    startProcessingPoll('then_vs_now', 'transformation', variant.id);
                                                  }
                                                }
                                              }}
                                              className={s.btnCancelOrange}
                                            >
                                              {normalizedVariant?.processing_state === 'cancelling' ? '❌ Force Cancel' : '⏹️ Cancel'}
                                            </Button>
                                          )}
                                          {variantLineupReady && (
                                            <span className={s.readyIndicator}>✓ Ready</span>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={async () => {
                                              if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) return;
                                              const newVV: VideoVariantsMap = {
                                                ...videoVariants,
                                                then_vs_now: { ...videoVariants.then_vs_now },
                                              };
                                              delete newVV.then_vs_now[compositeKey];
                                              setVideoVariants(newVV);
                                              const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                                              await handleMetadataUpdate(updatedMeta);
                                            }}
                                            className={s.btnDelete}
                                          >
                                            🗑️
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          size="sm"
                                          onClick={() => openAiModal('then_vs_now_transformation', 'home', legacyFullbodyUrl, variant.id, currentFullbodyUrl)}
                                          disabled={!hasBothInputs}
                                          className={s.btnSmall}
                                          style={{ width: '100%' }}
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

                        {!userCanEditProject && (
                          <div style={{ marginTop: '16px' }}>
                            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })()}

                {/* Assets Tab - Member-specific generated assets */}
                {activeTab === 'photo_composite' && (() => {
                  // Resolve input images for Step 1 (Gemini composite) — use halfbody (head-to-waist)
                  const legacyHalfbodyUrl =
                    resolveDisplayUrl(getBestUrl(videoVariants.halfbody.legacy)) || null;
                  const currentHalfbodyUrl =
                    resolveDisplayUrl(getBestUrl(videoVariants.halfbody.home)) || null;
                  const hasBothInputs = Boolean(legacyHalfbodyUrl) && Boolean(currentHalfbodyUrl);

                  // Step 1: Gemini composite image (stored in images.photo_composite.home)
                  const compositeImageData = videoVariants.photo_composite?.home;
                  const compositeImageUrl = compositeImageData ? resolveDisplayUrl(getBestUrl(compositeImageData)) : null;
                  const hasCompositeImage = Boolean(compositeImageData && getBestUrl(compositeImageData));

                  // Step 2: MiniMax video
                  const compositeVideoData = videoVariants.photo_composite?.default;
                  const compositeVideoUrl = compositeVideoData ? resolveDisplayUrl(getBestUrl(compositeVideoData)) : null;
                  const hasCompositeVideo = Boolean(compositeVideoData && getBestUrl(compositeVideoData));
                  const compositeVideoNormalized = normalizeVariantValue(compositeVideoData as any);
                  const compositeVideoLineupReady = isLineupReady(compositeVideoData);
                  const compositeVideoProcessing = isProcessing(compositeVideoData);
                  const compositeVideoCancellingOrProcessing =
                    compositeVideoNormalized?.processing_state === 'processing' ||
                    compositeVideoNormalized?.processing_state === 'cancelling';

                  return (
                    <Card>
                      <div className={s.cardPadding}>
                        <div className={s.flexSpaceBetween}>
                          <div className={s.flexCenterGap8}>
                            <span className={s.tabIcon}>👥</span>
                            <div className={s.tabTitle}>Duo Portret</div>
                          </div>
                          <Badge variant={userCanEditProject ? 'default' : 'info'}>
                            {userCanEditProject ? 'Editable' : 'Read-only'}
                          </Badge>
                        </div>

                        <div className={s.tabDescription}>
                          AI-composiet van twee versies van de speler (legacy + huidig). Vereist halfbody afbeeldingen van beide versies.
                        </div>

                        {/* Prerequisites */}
                        <div className={s.prerequisiteRow}>
                          <div className={s.prerequisiteCard} style={{
                            border: legacyHalfbodyUrl ? '2px solid var(--vscode-charts-green)' : '1px dashed var(--app-border)',
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>🏆 Legacy Halfbody</div>
                            {legacyHalfbodyUrl ? (
                              <img src={legacyHalfbodyUrl} alt="Legacy" className={s.prereqThumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div style={{ color: 'var(--app-text-muted)', fontSize: '11px' }}>⚠️ Genereer eerst Legacy Halfbody</div>
                            )}
                          </div>
                          <div className={s.prerequisiteCard} style={{
                            border: currentHalfbodyUrl ? '2px solid var(--vscode-charts-green)' : '1px dashed var(--app-border)',
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>👕 Huidige Halfbody</div>
                            {currentHalfbodyUrl ? (
                              <img src={currentHalfbodyUrl} alt="Current" className={s.prereqThumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div style={{ color: 'var(--app-text-muted)', fontSize: '11px' }}>⚠️ Genereer eerst Halfbody</div>
                            )}
                          </div>
                        </div>

                        {/* Pipeline steps as card grid (consistent with intro/celebration) */}
                        <div className={s.kitSectionMargin}>
                          <div className={s.variantGrid} style={{ opacity: hasBothInputs ? 1 : 0.5 }}>
                            {/* Step 1: Gemini Composite Image */}
                            <div className={s.variantCard} style={{
                              border: hasCompositeImage ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                            }}>
                              <div className={s.variantPreview916} style={{
                                background: hasCompositeImage ? '#000' : undefined,
                              }}>
                                {hasCompositeImage && compositeImageUrl ? (
                                  <>
                                    <img key={compositeImageUrl} src={compositeImageUrl} alt="Gemini Composite" className={s.mediaCoverContain} />
                                    <div className={s.overlayBadgeContainer}>
                                      <div className={s.aiBadge}>AI</div>
                                    </div>
                                  </>
                                ) : (
                                  <div className={s.notGeneratedText}>
                                    Niet gegenereerd
                                  </div>
                                )}
                              </div>
                              <div className={s.cardFooterPadding}>
                                <div className={s.variantLabel}>
                                  📸 Gemini Composite
                                </div>
                                <div className={s.actionButtonRow}>
                                  <Button
                                    size="sm"
                                    onClick={() => openAiModal('photo_composite_gemini', 'home', legacyHalfbodyUrl, null, currentHalfbodyUrl)}
                                    disabled={!hasBothInputs}
                                    className={s.btnSmall}
                                    style={{ width: '100%' }}
                                  >
                                    {hasCompositeImage ? '🔄 Opnieuw' : '✨ Genereer'}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Step 2: MiniMax Video */}
                            <div className={s.variantCard} style={{
                              border: hasCompositeVideo ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                              opacity: hasCompositeImage ? 1 : 0.4,
                            }}>
                              <div
                                onClick={() => { if (compositeVideoUrl) setVideoPreviewUrl(compositeVideoUrl); }}
                                className={s.variantPreview916}
                                style={{
                                  background: (hasCompositeVideo && !compositeVideoLineupReady) ? '#000' : undefined,
                                  cursor: hasCompositeVideo ? 'pointer' : 'default',
                                }}>
                                {hasCompositeVideo && compositeVideoUrl ? (
                                  <>
                                    <video key={compositeVideoUrl} src={compositeVideoUrl} className={s.mediaCoverContain} muted loop playsInline autoPlay />
                                    <div className={s.overlayBadgeContainer}>
                                      <div className={s.aiBadge}>AI</div>
                                      <ProcessingBadge value={compositeVideoData} />
                                    </div>
                                  </>
                                ) : (
                                  <div className={s.notGeneratedText}>
                                    Niet gegenereerd
                                  </div>
                                )}
                              </div>
                              <div className={s.cardFooterPadding}>
                                <div className={s.variantLabel}>
                                  🎬 MiniMax Video
                                </div>
                                <div className={s.actionButtonRow}>
                                  {hasCompositeVideo ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => { if (compositeImageUrl) openAiModal('photo_composite_video', 'home', compositeImageUrl, null, null); }}
                                        disabled={!hasCompositeImage}
                                        className={s.btnSmall}
                                        style={{ flex: 1 }}
                                      >
                                        Opnieuw
                                      </Button>
                                      {!compositeVideoProcessing && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'photo_composite', 'default', null);
                                            if (result.ok) {
                                              const rawUrl = getVariantRawUrl(compositeVideoData) || '';
                                              setVideoVariants(prev => ({ ...prev, photo_composite: { ...prev.photo_composite, default: { raw: rawUrl, processed: null, processing_state: 'processing' as const } } }));
                                              startProcessingPoll('photo_composite', 'default');
                                            }
                                          }}
                                          className={s.btnProcess}
                                        >
                                          {compositeVideoLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                        </Button>
                                      )}
                                      {compositeVideoCancellingOrProcessing && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={async () => {
                                            const isCancelling = compositeVideoNormalized?.processing_state === 'cancelling';
                                            const result = await cancelAssetProcessing(apiBaseUrl, membershipId!, 'photo_composite', 'default', null, isCancelling);
                                            if (result.ok) {
                                              if (isCancelling) {
                                                try {
                                                  const memberRes = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(membershipId!)}/`, { credentials: 'include' });
                                                  if (memberRes.ok) { const json = await memberRes.json(); setMembership(json?.data || json); }
                                                } catch { /* best-effort */ }
                                              } else {
                                                const rawUrl = getVariantRawUrl(compositeVideoData) || '';
                                                setVideoVariants(prev => ({ ...prev, photo_composite: { ...prev.photo_composite, default: { raw: rawUrl, processed: null, processing_state: 'cancelling' as const } } }));
                                                startProcessingPoll('photo_composite', 'default');
                                              }
                                            }
                                          }}
                                          className={s.btnCancelOrange}
                                        >
                                          {compositeVideoNormalized?.processing_state === 'cancelling' ? '❌ Force Cancel' : '⏹️ Cancel'}
                                        </Button>
                                      )}
                                      {compositeVideoLineupReady && (
                                        <span className={s.readyIndicator}>✓ Ready</span>
                                      )}
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => { if (compositeImageUrl) openAiModal('photo_composite_video', 'home', compositeImageUrl, null, null); }}
                                      disabled={!hasCompositeImage}
                                      className={s.btnSmall}
                                      style={{ width: '100%' }}
                                    >
                                      ✨ Genereer
                                    </Button>
                                  )}
                                </div>
                              </div>
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
                  );
                })()}

                {/* ── Walking Composite Tab ── */}
                {activeTab === 'walking_composite' && (() => {
                  // Resolve input images: fullbody (not halfbody) for walking composite
                  const legacyFullbodyUrl =
                    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.legacy)) || null;
                  const currentFullbodyUrl =
                    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.home)) || null;
                  const hasBothInputs = Boolean(legacyFullbodyUrl) && Boolean(currentFullbodyUrl);

                  // Step 1: Far image
                  const farImageData = videoVariants.walking_composite?.far;
                  const farImageUrl = farImageData ? resolveDisplayUrl(getBestUrl(farImageData)) : null;
                  const hasFarImage = Boolean(farImageData && getBestUrl(farImageData));

                  // Step 2: Near image
                  const nearImageData = videoVariants.walking_composite?.near;
                  const nearImageUrl = nearImageData ? resolveDisplayUrl(getBestUrl(nearImageData)) : null;
                  const hasNearImage = Boolean(nearImageData && getBestUrl(nearImageData));

                  // Step 3: Walking video
                  const walkingVideoData = videoVariants.walking_composite?.default;
                  const walkingVideoUrl = walkingVideoData ? resolveDisplayUrl(getBestUrl(walkingVideoData)) : null;
                  const hasWalkingVideo = Boolean(walkingVideoData && getBestUrl(walkingVideoData));
                  const walkingVideoLineupReady = isLineupReady(walkingVideoData);
                  const walkingVideoProcessing = isProcessing(walkingVideoData);
                  const walkingVideoNormalized = normalizeVariantValue(walkingVideoData as any);
                  const walkingVideoCancellingOrProcessing =
                    walkingVideoNormalized?.processing_state === 'processing' ||
                    walkingVideoNormalized?.processing_state === 'cancelling';

                  return (
                    <Card>
                      <div className={s.cardPadding}>
                        <div className={s.flexSpaceBetween}>
                          <div className={s.flexCenterGap8}>
                            <span className={s.tabIcon}>🚶</span>
                            <div className={s.tabTitle}>Walking Composite</div>
                          </div>
                          <Badge variant={userCanEditProject ? 'default' : 'info'}>
                            {userCanEditProject ? 'Editable' : 'Read-only'}
                          </Badge>
                        </div>

                        <div className={s.tabDescription}>
                          Full-body walking video: twee Gemini-beelden (ver + dichtbij) en een MiniMax video waarin de spelers naar de camera lopen.
                        </div>

                        {/* Prerequisites */}
                        <div className={s.prerequisiteRow}>
                          <div className={s.prerequisiteCard} style={{
                            border: legacyFullbodyUrl ? '2px solid var(--vscode-charts-green)' : '1px dashed var(--app-border)',
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>🏆 Legacy Fullbody</div>
                            {legacyFullbodyUrl ? (
                              <img src={legacyFullbodyUrl} alt="Legacy" className={s.prereqThumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div style={{ color: 'var(--app-text-muted)', fontSize: '11px' }}>⚠️ Genereer eerst Legacy Fullbody</div>
                            )}
                          </div>
                          <div className={s.prerequisiteCard} style={{
                            border: currentFullbodyUrl ? '2px solid var(--vscode-charts-green)' : '1px dashed var(--app-border)',
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>👕 Huidige Fullbody</div>
                            {currentFullbodyUrl ? (
                              <img src={currentFullbodyUrl} alt="Current" className={s.prereqThumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div style={{ color: 'var(--app-text-muted)', fontSize: '11px' }}>⚠️ Genereer eerst Fullbody</div>
                            )}
                          </div>
                        </div>

                        {/* Pipeline steps as card grid (consistent with intro/celebration) */}
                        <div className={s.kitSectionMargin}>
                          <div className={s.variantGrid} style={{ opacity: hasBothInputs ? 1 : 0.5 }}>
                            {/* Step 1: Far Image */}
                            <div className={s.variantCard} style={{
                              border: hasFarImage ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                            }}>
                              <div className={s.variantPreview916} style={{
                                background: hasFarImage ? '#000' : undefined,
                              }}>
                                {hasFarImage && farImageUrl ? (
                                  <>
                                    <img key={farImageUrl} src={farImageUrl} alt="Far composite" className={s.mediaCoverContain} />
                                    <div className={s.overlayBadgeContainer}>
                                      <div className={s.aiBadge}>AI</div>
                                    </div>
                                  </>
                                ) : (
                                  <div className={s.notGeneratedText}>
                                    Niet gegenereerd
                                  </div>
                                )}
                              </div>
                              <div className={s.cardFooterPadding}>
                                <div className={s.variantLabel}>
                                  📸 Ver Beeld
                                </div>
                                <div className={s.actionButtonRow}>
                                  <Button
                                    size="sm"
                                    onClick={() => openAiModal('walking_composite_far', 'home', legacyFullbodyUrl, null, currentFullbodyUrl)}
                                    disabled={!hasBothInputs}
                                    className={s.btnSmall}
                                    style={{ width: '100%' }}
                                  >
                                    {hasFarImage ? '🔄 Opnieuw' : '✨ Genereer'}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Step 2: Near Image */}
                            <div className={s.variantCard} style={{
                              border: hasNearImage ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                            }}>
                              <div className={s.variantPreview916} style={{
                                background: hasNearImage ? '#000' : undefined,
                              }}>
                                {hasNearImage && nearImageUrl ? (
                                  <>
                                    <img key={nearImageUrl} src={nearImageUrl} alt="Near composite" className={s.mediaCoverContain} />
                                    <div className={s.overlayBadgeContainer}>
                                      <div className={s.aiBadge}>AI</div>
                                    </div>
                                  </>
                                ) : (
                                  <div className={s.notGeneratedText}>
                                    Niet gegenereerd
                                  </div>
                                )}
                              </div>
                              <div className={s.cardFooterPadding}>
                                <div className={s.variantLabel}>
                                  📸 Dichtbij Beeld
                                </div>
                                <div className={s.actionButtonRow}>
                                  <Button
                                    size="sm"
                                    onClick={() => openAiModal('walking_composite_near', 'home', legacyFullbodyUrl, null, currentFullbodyUrl)}
                                    disabled={!hasBothInputs}
                                    className={s.btnSmall}
                                    style={{ width: '100%' }}
                                  >
                                    {hasNearImage ? '🔄 Opnieuw' : '✨ Genereer'}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Step 3: Walking Video */}
                            <div className={s.variantCard} style={{
                              border: hasWalkingVideo ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                              opacity: (hasFarImage && hasNearImage) ? 1 : 0.4,
                            }}>
                              <div
                                onClick={() => { if (walkingVideoUrl) setVideoPreviewUrl(walkingVideoUrl); }}
                                className={s.variantPreview916}
                                style={{
                                  background: (hasWalkingVideo && !walkingVideoLineupReady) ? '#000' : undefined,
                                  cursor: hasWalkingVideo ? 'pointer' : 'default',
                                }}>
                                {hasWalkingVideo && walkingVideoUrl ? (
                                  <>
                                    <video key={walkingVideoUrl} src={walkingVideoUrl} className={s.mediaCoverContain} muted loop playsInline autoPlay />
                                    <div className={s.overlayBadgeContainer}>
                                      <div className={s.aiBadge}>AI</div>
                                      <ProcessingBadge value={walkingVideoData} />
                                    </div>
                                  </>
                                ) : (
                                  <div className={s.notGeneratedText}>
                                    Niet gegenereerd
                                  </div>
                                )}
                              </div>
                              <div className={s.cardFooterPadding}>
                                <div className={s.variantLabel}>
                                  🎬 Walking Video
                                </div>
                                <div className={s.actionButtonRow}>
                                  {hasWalkingVideo ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => { if (farImageUrl) openAiModal('walking_composite_video', 'home', farImageUrl, null, nearImageUrl); }}
                                        disabled={!(hasFarImage && hasNearImage)}
                                        className={s.btnSmall}
                                        style={{ flex: 1 }}
                                      >
                                        Opnieuw
                                      </Button>
                                      {!walkingVideoProcessing && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={async () => {
                                            const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'walking_composite', 'default', null);
                                            if (result.ok) {
                                              const rawUrl = getVariantRawUrl(walkingVideoData) || '';
                                              setVideoVariants(prev => ({ ...prev, walking_composite: { ...prev.walking_composite, default: { raw: rawUrl, processed: null, processing_state: 'processing' as const } } }));
                                              startProcessingPoll('walking_composite', 'default');
                                            }
                                          }}
                                          className={s.btnProcess}
                                        >
                                          {walkingVideoLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                        </Button>
                                      )}
                                      {walkingVideoCancellingOrProcessing && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={async () => {
                                            const isCancelling = walkingVideoNormalized?.processing_state === 'cancelling';
                                            const result = await cancelAssetProcessing(apiBaseUrl, membershipId!, 'walking_composite', 'default', null, isCancelling);
                                            if (result.ok) {
                                              if (isCancelling) {
                                                try {
                                                  const memberRes = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(membershipId!)}/`, { credentials: 'include' });
                                                  if (memberRes.ok) { const json = await memberRes.json(); setMembership(json?.data || json); }
                                                } catch { /* best-effort */ }
                                              } else {
                                                const rawUrl = getVariantRawUrl(walkingVideoData) || '';
                                                setVideoVariants(prev => ({ ...prev, walking_composite: { ...prev.walking_composite, default: { raw: rawUrl, processed: null, processing_state: 'cancelling' as const } } }));
                                                startProcessingPoll('walking_composite', 'default');
                                              }
                                            }
                                          }}
                                          className={s.btnCancelOrange}
                                        >
                                          {walkingVideoNormalized?.processing_state === 'cancelling' ? '❌ Force Cancel' : '⏹️ Cancel'}
                                        </Button>
                                      )}
                                      {walkingVideoLineupReady && (
                                        <span className={s.readyIndicator}>✓ Ready</span>
                                      )}
                                    </>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => { if (farImageUrl) openAiModal('walking_composite_video', 'home', farImageUrl, null, nearImageUrl); }}
                                      disabled={!(hasFarImage && hasNearImage)}
                                      className={s.btnSmall}
                                      style={{ width: '100%' }}
                                    >
                                      ✨ Genereer
                                    </Button>
                                  )}
                                </div>
                              </div>
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
                  );
                })()}

                {/* Action Photo Tab - Grouped by tenue type */}
                {activeTab === 'action_photo' && (() => {
                  const actionVariants = videoVariants.action_photo || {};
                  const styleVariants = ['dribbling', 'shooting', 'ball_at_feet', 'celebrating', 'heading', 'sliding_tackle', 'karate_kick'];
                  const styleLabels: Record<string, string> = {
                    dribbling: '🏃 Dribbelen',
                    shooting: '⚽ Schieten',
                    ball_at_feet: '🦶 Bal aan de voet',
                    celebrating: '🎉 Vieren',
                    heading: '🤕 Koppen',
                    sliding_tackle: '🦵 Sliding',
                    karate_kick: '🥋 Karatetrap',
                  };

                  return (
                    <Card>
                      <div className={s.cardPadding}>
                        <div className={s.flexSpaceBetween}>
                          <div className={s.flexCenterGap8}>
                            <span className={s.tabIcon}>⚡</span>
                            <div className={s.tabTitle}>Actiefoto's</div>
                          </div>
                          <Badge variant={userCanEditProject ? 'default' : 'info'}>
                            {userCanEditProject ? 'Editable' : 'Read-only'}
                          </Badge>
                        </div>

                        <div className={s.tabDescription}>
                          Dynamische actiebeelden van de speler — dribbelen, schieten, koppen en meer.
                        </div>

                        {/* Per-Kit Sections - matches Assets tab structure */}
                        {effectiveKits.map((kit) => {
                          // Get all action photo variants for this kit
                          const kitActionPhotos = styleVariants.map((style) => {
                            const variantKey = `${kit.id}_${style}`;
                            const variantValue = actionVariants[variantKey];
                            const normalized: AssetVariantValue | null = typeof variantValue === 'string'
                              ? { raw: variantValue, processed: null, processing_state: 'raw' }
                              : (variantValue as AssetVariantValue | null);
                            const storagePath = normalized?.processed || normalized?.raw || null;
                            const url = resolveDisplayUrl(storagePath);
                            const state = normalized?.processing_state || 'raw';
                            return { style, variantKey, url, state, normalized };
                          });

                          const fullbodyRef = getVariantDisplayUrl(videoVariants.fullbody?.[kit.id]);

                          return (
                            <div key={`action-kit-${kit.id}`} className={s.kitSectionMargin}>
                              <div className={s.flexCenterGap8} style={{ marginBottom: '12px' }}>
                                {kit.url ? (
                                  <img src={kit.url} alt={kit.label} className={s.kitIconImg} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                  <span style={{ fontSize: '20px' }}>{kit.icon}</span>
                                )}
                                <div className={s.sectionTitle}>{kit.label}</div>
                                {userCanEditProject && fullbodyRef && (
                                  <Button
                                    size="sm"
                                    onClick={() => openAiModal('member_action_photo', kit.id, fullbodyRef, null)}
                                    className={s.btnSmall}
                                    style={{ marginLeft: 'auto' }}
                                  >
                                    ✨ Genereer
                                  </Button>
                                )}
                                {!fullbodyRef && (
                                  <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: 'auto' }}>Fullbody vereist</span>
                                )}
                              </div>

                              <div className={s.variantGrid}>
                                {kitActionPhotos.map(({ style, variantKey, url, state, normalized }) => {
                                  const isProcessing = state === 'processing';
                                  const isProcessed = state === 'processed' && normalized?.processed;

                                  return (
                                    <div key={variantKey} className={s.variantCard} style={{
                                      border: isProcessed ? '2px solid var(--vscode-charts-green)' : url ? '2px solid #f59e0b' : '1px solid var(--app-border)',
                                    }}>
                                      <div
                                        onClick={() => { if (url) window.open(url, '_blank'); }}
                                        className={s.variantPreview916}
                                        style={{
                                          background: url
                                            ? `url(${url}) center/cover no-repeat, repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 16px 16px`
                                            : undefined,
                                          cursor: url ? 'zoom-in' : 'default',
                                        }}
                                      >
                                        {!url && (
                                          <div className={s.notGeneratedText} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                            Niet gegenereerd
                                          </div>
                                        )}
                                        {url && (
                                          <div className={s.overlayBadgeContainer}>
                                            <div className={s.aiBadge}>AI</div>
                                            <ProcessingBadge value={normalized} />
                                          </div>
                                        )}
                                        {isProcessing && (
                                          <div className={s.processingOverlay}>
                                            ⏳ Bezig...
                                          </div>
                                        )}
                                      </div>
                                      <div className={s.cardFooterPadding}>
                                        <div className={s.variantLabel}>
                                          {styleLabels[style] || style}
                                        </div>
                                        <div className={s.actionButtonRow}>
                                          {url && !isProcessing && userCanEditProject && (
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              onClick={async () => {
                                                await triggerAssetProcessing(apiBaseUrl, membershipId!, 'action_photo', variantKey, null);
                                              }}
                                              className={s.btnProcess}
                                            >
                                              {isProcessed ? '🔄 Opnieuw' : '🔧 Bewerken'}
                                            </Button>
                                          )}
                                          {isProcessed && <span className={s.readyIndicator}>✓ Ready</span>}
                                          {url && userCanEditProject && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={async () => {
                                                if (!confirm('Weet je zeker dat je deze actiefoto wilt verwijderen?')) return;
                                                const newVV = { ...videoVariants, action_photo: { ...videoVariants.action_photo } };
                                                delete newVV.action_photo[variantKey];
                                                setVideoVariants(newVV);
                                                const updated = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                                                await handleMetadataUpdate(updated);
                                              }}
                                              className={s.btnDelete}
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
                          );
                        })}

                        {!userCanEditProject && (
                          <div style={{ marginTop: '16px' }}>
                            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })()}

                {/* Assets Tab - Grouped by tenue type */}
                {activeTab === 'assets' && (
                  <Card>
                    <div className={s.cardPadding}>
                      <div className={s.flexSpaceBetween}>
                        <div className={s.flexCenterGap8}>
                          <span className={s.tabIcon}>🎨</span>
                          <div className={s.tabTitle}>Gegenereerde Assets</div>
                        </div>
                        <Badge variant={userCanEditProject ? 'default' : 'info'}>
                          {userCanEditProject ? 'Editable' : 'Read-only'}
                        </Badge>
                      </div>

                      <div className={s.tabDescription}>
                        AI-gegenereerde afbeeldingen van dit lid per tenue type: fullbody, halfbody en close-up.
                      </div>

                      {/* Per-Kit Sections */}
                      {effectiveKits.map((kit) => {
                        // Fullbody for this kit
                        const fbVal = videoVariants.fullbody[kit.id] || (kit.id === 'home' ? form.kit?.url : null) || null;
                        const fbUrl = getVariantDisplayUrl(fbVal);
                        const fbLineupReady = isLineupReady(fbVal);
                        const fbProcessing = isProcessing(fbVal);

                        // Halfbody for this kit
                        const hbVal = videoVariants.halfbody[kit.id] || null;
                        const hbUrl = getVariantDisplayUrl(hbVal);
                        const hbLineupReady = isLineupReady(hbVal);
                        const hbProcessing = isProcessing(hbVal);

                        // Closeup for this kit
                        const cuVal = videoVariants.closeup[kit.id] || (kit.id === 'home' ? form.closeup?.url : null) || null;
                        const cuUrl = getVariantDisplayUrl(cuVal);
                        const cuLineupReady = isLineupReady(cuVal);
                        const cuProcessing = isProcessing(cuVal);

                        const fullbodyRef = getVariantDisplayUrl(videoVariants.fullbody[kit.id]);

                        return (
                          <div key={`assets-kit-${kit.id}`} className={s.kitSectionMargin}>
                            <div className={s.flexCenterGap8} style={{ marginBottom: '12px' }}>
                              {kit.url ? (
                                <img src={kit.url} alt={kit.label} className={s.kitIconImg} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <span style={{ fontSize: '20px' }}>{kit.icon}</span>
                              )}
                              <div className={s.sectionTitle}>{kit.label}</div>
                            </div>

                            <div className={s.variantGrid}>
                              {/* Fullbody Card */}
                              <div className={s.variantCard} style={{
                                border: fbLineupReady ? '2px solid var(--vscode-charts-green)' : fbUrl ? '2px solid #f59e0b' : '1px solid var(--app-border)',
                              }}>
                                <div
                                  onClick={() => { const url = resolveDisplayUrl(fbUrl); if (url) window.open(url, '_blank'); }}
                                  className={s.variantPreview34}
                                  style={{
                                    background: fbUrl
                                      ? `url(${resolveDisplayUrl(fbUrl)}) center/contain no-repeat, repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 16px 16px`
                                      : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                    cursor: fbUrl ? 'zoom-in' : 'default',
                                  }}>
                                  {!fbUrl && <div className={s.processingOverlay} style={{ background: 'none', color: 'var(--app-text-muted)', fontSize: '12px', fontWeight: 'normal' }}>Niet gegenereerd</div>}
                                  {fbUrl && (
                                    <div className={s.overlayBadgeContainer}>
                                      <div className={s.aiBadge}>AI</div>
                                      <ProcessingBadge value={fbVal} />
                                    </div>
                                  )}
                                  {fbProcessing && <div className={s.processingOverlay}>⏳ Bezig...</div>}
                                </div>
                                <div className={s.cardFooterPadding}>
                                  <div className={s.variantLabel}>👕 Fullbody</div>
                                  <div className={s.actionButtonRow}>
                                    <Button size="sm" onClick={() => openAiModal('fullbody_in_tenue', kit.id)} className={s.btnSmall}>
                                      {fbUrl ? '🔄 Opnieuw' : '✨ Genereer'}
                                    </Button>
                                    {fbUrl && !fbProcessing && (
                                      <Button size="sm" variant="secondary" onClick={async () => {
                                        const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'fullbody', kit.id);
                                        if (result.ok) {
                                          const rawUrl = getVariantRawUrl(fbVal);
                                          setVideoVariants(prev => ({ ...prev, fullbody: { ...prev.fullbody, [kit.id]: { raw: rawUrl || '', processed: null, processing_state: 'processing' as const } } }));
                                          startProcessingPoll('fullbody', kit.id, null);
                                        }
                                      }} className={s.btnProcess}>
                                        {fbLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                      </Button>
                                    )}
                                    {fbUrl && fbLineupReady && <span className={s.readyIndicator}>✓ Ready</span>}
                                    {fbUrl && (
                                      <Button size="sm" variant="ghost" onClick={async () => {
                                        if (!confirm('Weet je zeker dat je deze asset wilt verwijderen?')) return;
                                        const newVV = { ...videoVariants, fullbody: { ...videoVariants.fullbody } };
                                        delete newVV.fullbody[kit.id];
                                        setVideoVariants(newVV);
                                        const newForm = kit.id === 'home' ? { ...form, kit: { url: '', caption: '' } } : form;
                                        if (kit.id === 'home') setForm(newForm);
                                        const updated = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVV);
                                        await handleMetadataUpdate(updated);
                                      }} className={s.btnDelete}>🗑️</Button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Halfbody Card */}
                              <div className={s.variantCard} style={{
                                border: hbLineupReady ? '2px solid var(--vscode-charts-green)' : hbUrl ? '2px solid #f59e0b' : '1px solid var(--app-border)',
                              }}>
                                <div
                                  onClick={() => { const url = resolveDisplayUrl(hbUrl); if (url) window.open(url, '_blank'); }}
                                  className={s.variantPreview34}
                                  style={{
                                    background: hbUrl
                                      ? `url(${resolveDisplayUrl(hbUrl)}) center/contain no-repeat, repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 16px 16px`
                                      : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                    cursor: hbUrl ? 'zoom-in' : 'default',
                                  }}>
                                  {!hbUrl && <div className={s.processingOverlay} style={{ background: 'none', color: 'var(--app-text-muted)', fontSize: '12px', fontWeight: 'normal' }}>Niet gegenereerd</div>}
                                  {hbUrl && (
                                    <div className={s.overlayBadgeContainer}>
                                      <div className={s.aiBadge}>AI</div>
                                      <ProcessingBadge value={hbVal} />
                                    </div>
                                  )}
                                  {hbProcessing && <div className={s.processingOverlay}>⏳ Bezig...</div>}
                                </div>
                                <div className={s.cardFooterPadding}>
                                  <div className={s.variantLabel}>👤 Halfbody</div>
                                  <div className={s.actionButtonRow}>
                                    <Button size="sm" onClick={() => cropHalfbodyFromFullbody(kit.id)} disabled={croppingHalfbody[kit.id] || !fullbodyRef} className={s.btnSmall} title={!fullbodyRef ? 'Genereer eerst een fullbody' : ''}>
                                      {croppingHalfbody[kit.id] ? '⏳...' : hbUrl ? '🔄 Opnieuw' : '✂️ Crop'}
                                    </Button>
                                    {hbUrl && (
                                      <Button size="sm" variant="ghost" onClick={async () => {
                                        if (!confirm('Weet je zeker dat je deze asset wilt verwijderen?')) return;
                                        const newVV = { ...videoVariants, halfbody: { ...videoVariants.halfbody } };
                                        delete newVV.halfbody[kit.id];
                                        setVideoVariants(newVV);
                                        const updated = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                                        await handleMetadataUpdate(updated);
                                      }} className={s.btnDelete}>🗑️</Button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Closeup Card */}
                              <div className={s.variantCard} style={{
                                border: cuLineupReady ? '2px solid var(--vscode-charts-green)' : cuUrl ? '2px solid #f59e0b' : '1px solid var(--app-border)',
                              }}>
                                <div
                                  onClick={() => { const url = resolveDisplayUrl(cuUrl); if (url) window.open(url, '_blank'); }}
                                  className={s.variantPreview34}
                                  style={{
                                    aspectRatio: '1/1',
                                    background: cuUrl
                                      ? `url(${resolveDisplayUrl(cuUrl)}) center/contain no-repeat, repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 16px 16px`
                                      : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                                    minHeight: '150px',
                                    cursor: cuUrl ? 'zoom-in' : 'default',
                                  }}>
                                  {!cuUrl && <div className={s.processingOverlay} style={{ background: 'none', color: 'var(--app-text-muted)', fontSize: '12px', fontWeight: 'normal' }}>Niet gegenereerd</div>}
                                  {cuUrl && (
                                    <div className={s.overlayBadgeContainer}>
                                      <div className={s.aiBadge}>AI</div>
                                      <ProcessingBadge value={cuVal} />
                                    </div>
                                  )}
                                  {cuProcessing && <div className={s.processingOverlay}>⏳ Bezig...</div>}
                                </div>
                                <div className={s.cardFooterPadding}>
                                  <div className={s.variantLabel}>📸 Close-up</div>
                                  <div className={s.actionButtonRow}>
                                    <Button size="sm" onClick={() => cropCloseupFromFullbody(kit.id)} disabled={croppingCloseup[kit.id] || !fullbodyRef} className={s.btnSmall} title={!fullbodyRef ? 'Genereer eerst een fullbody' : ''}>
                                      {croppingCloseup[kit.id] ? '⏳...' : cuUrl ? '🔄 Opnieuw' : '✂️ Crop'}
                                    </Button>
                                    {cuUrl && !cuProcessing && (
                                      <Button size="sm" variant="secondary" onClick={async () => {
                                        const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'closeup', kit.id);
                                        if (result.ok) {
                                          const rawUrl = getVariantRawUrl(cuVal);
                                          setVideoVariants(prev => ({ ...prev, closeup: { ...prev.closeup, [kit.id]: { raw: rawUrl || '', processed: null, processing_state: 'processing' as const } } }));
                                          startProcessingPoll('closeup', kit.id, null);
                                        }
                                      }} className={s.btnProcess}>
                                        {cuLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                      </Button>
                                    )}
                                    {cuUrl && (
                                      <Button size="sm" variant="ghost" onClick={async () => {
                                        if (!confirm('Weet je zeker dat je deze asset wilt verwijderen?')) return;
                                        const newVV = { ...videoVariants, closeup: { ...videoVariants.closeup } };
                                        delete newVV.closeup[kit.id];
                                        setVideoVariants(newVV);
                                        const newForm = kit.id === 'home' ? { ...form, closeup: { url: '', caption: '' } } : form;
                                        if (kit.id === 'home') setForm(newForm);
                                        const updated = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVV);
                                        await handleMetadataUpdate(updated);
                                      }} className={s.btnDelete}>🗑️</Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

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

                      {!userCanEditProject && (
                        <div style={{ marginTop: '16px' }}>
                          <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
                        </div>
                      )}
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

              </div>

              <div className="space-y-6">


                <Card>
                  <div className={s.cardPadding}>
                    <div className={s.sectionTitleLarge}>Member</div>
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
        projectId={isTeamRoute ? String(project?.id || '') : String(club?.id || project?.id || '')}
        organisationId={String(org?.id || '')}
        membershipId={membershipId}
        requireApproval
        inputAssets={{
          logo: (teamBrand.getAsset?.('logo_upload') || clubBrand.getAsset?.('logo_upload'))
            ? getAssetUrl((teamBrand.getAsset?.('logo_upload') || clubBrand.getAsset?.('logo_upload'))!.url)
            : null,
          sponsor: (teamBrand.getAsset?.('sponsor_logo_upload') || clubBrand.getAsset?.('sponsor_logo_upload'))
            ? getAssetUrl((teamBrand.getAsset?.('sponsor_logo_upload') || clubBrand.getAsset?.('sponsor_logo_upload'))!.url)
            : null,
          reference: aiSelectedKitUrl,
          // For intro/celebration: use player in tenue as input, otherwise use profile photo
          // For legacy kit: use legacy_photo instead of profile photo
          person: aiInputPersonUrl
            ? getAssetUrl(aiInputPersonUrl)
            : aiSelectedKitType === 'legacy'
              ? resolveDisplayUrl(form.legacy_photo?.url) || resolveDisplayUrl(form.profile?.url) || membership?.user?.avatar_url || null
              : resolveDisplayUrl(form.profile?.url) || membership?.user?.avatar_url || null,
          // Club/team background for photo_composite_gemini
          background: (() => {
            const bgs = clubBrand.getAssets?.('club_background') || [];
            const bg = bgs[0] || clubBrand.getAsset?.('stadium_background');
            return bg ? getAssetUrl(bg.url) : null;
          })(),
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
                  : aiPreselectedTemplate === 'then_vs_now_sidebyside'
                    ? getBestUrl(videoVariants.then_vs_now.sidebyside) || null
                    : aiPreselectedTemplate === 'then_vs_now_transformation' && aiSelectedStyleVariant
                      ? getBestUrl(videoVariants.then_vs_now[`transformation_${aiSelectedStyleVariant}`]) || getBestUrl(videoVariants.then_vs_now.transformation) || null
                      : aiPreselectedTemplate === 'then_vs_now_transformation'
                        ? getBestUrl(videoVariants.then_vs_now.transformation) || null
                        : aiPreselectedTemplate === 'photo_composite_gemini'
                          ? getBestUrl(videoVariants.photo_composite?.home) || null
                          : aiPreselectedTemplate === 'photo_composite_video'
                            ? getBestUrl(videoVariants.photo_composite?.default) || null
                            : aiPreselectedTemplate === 'walking_composite_far'
                              ? getBestUrl(videoVariants.walking_composite?.far) || null
                              : aiPreselectedTemplate === 'walking_composite_near'
                                ? getBestUrl(videoVariants.walking_composite?.near) || null
                                : aiPreselectedTemplate === 'walking_composite_video'
                                  ? getBestUrl(videoVariants.walking_composite?.default) || null
                                  : null
        }
        availableBackgrounds={(() => {
          const bgs: Array<{ url: string; label?: string }> = [];
          // Club backgrounds
          const clubBgs = clubBrand.getAssets?.('club_background') || [];
          clubBgs.forEach((bg, idx) => {
            if (bg?.url) {
              const resolvedUrl = getAssetUrl(bg.url);
              if (resolvedUrl) {
                bgs.push({ url: resolvedUrl, label: bg.label || `Clubachtergrond ${idx + 1}` });
              }
            }
          });
          // Stadium background as fallback
          const stadiumBg = clubBrand.getAsset?.('stadium_background');
          if (stadiumBg?.url) {
            const resolvedUrl = getAssetUrl(stadiumBg.url);
            if (resolvedUrl) {
              bgs.push({ url: resolvedUrl, label: 'Stadion' });
            }
          }
          return bgs;
        })()}
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
            const isThenVsNow = assetType.startsWith('then_vs_now');

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
            } else if (isThenVsNow) {
              // Then vs Now video storage
              // Transformation uses composite key: transformation_{style_variant}
              // Side-by-side stays as: sidebyside
              let variantKey: string;
              if (assetType === 'then_vs_now_sidebyside') {
                variantKey = 'sidebyside';
              } else if (assetType === 'then_vs_now_transformation' && aiSelectedStyleVariant) {
                variantKey = `transformation_${aiSelectedStyleVariant}`;
              } else {
                variantKey = assetType === 'then_vs_now_transformation' ? 'transformation'
                  : assetType.replace('then_vs_now_', '');
              }
              console.log(`🎯 Saving then_vs_now variant: ${variantKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                then_vs_now: {
                  ...videoVariants.then_vs_now,
                  [variantKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVariants);
              await handleMetadataUpdate(updatedMeta, saveMembershipId);
            } else if (assetType.startsWith('photo_composite')) {
              // Photo composite: Gemini image or MiniMax video
              // Gemini image → photo_composite.home (will be propagated by backend)
              // MiniMax video → photo_composite.default (will be propagated by backend)
              const isGeminiImage = assetType === 'photo_composite_gemini';
              const variantKey = isGeminiImage ? 'home' : 'default';
              console.log(`🎯 Saving photo_composite: ${variantKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                photo_composite: {
                  ...videoVariants.photo_composite,
                  [variantKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              // Don't manually update metadata here — backend propagation handles it
              // Just refresh the membership to pick up the propagated changes
              try {
                const memberRes = await fetch(
                  `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(saveMembershipId)}/`,
                  { credentials: 'include' }
                );
                if (memberRes.ok) {
                  const json = await memberRes.json();
                  setMembership(json?.data || json);
                }
              } catch { /* best-effort refresh */ }
            } else if (assetType.startsWith('action_photo')) {
              // Action photo: action_photo_{kitType}_{styleVariant}
              // e.g. action_photo_home_dribbling → composite key: home_dribbling
              const compositeKey = assetType.replace('action_photo_', '') || `${aiSelectedKitType || 'home'}_dribbling`;
              console.log(`🎯 Saving action_photo: ${compositeKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                action_photo: {
                  ...videoVariants.action_photo,
                  [compositeKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              // Don't manually update metadata here — backend propagation handles it
              // Just refresh the membership to pick up the propagated changes
              try {
                const memberRes = await fetch(
                  `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(saveMembershipId)}/`,
                  { credentials: 'include' }
                );
                if (memberRes.ok) {
                  const json = await memberRes.json();
                  setMembership(json?.data || json);
                }
              } catch { /* best-effort refresh */ }
            } else if (assetType.startsWith('walking_composite')) {
              // Walking composite: far image, near image, or walking video
              // far → walking_composite.far, near → walking_composite.near, video → walking_composite.default
              const variantKey = assetType === 'walking_composite_far' ? 'far'
                : assetType === 'walking_composite_near' ? 'near'
                : 'default';
              console.log(`🎯 Saving walking_composite: ${variantKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                walking_composite: {
                  ...videoVariants.walking_composite,
                  [variantKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              // Backend propagation handles metadata — just refresh
              try {
                const memberRes = await fetch(
                  `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(saveMembershipId)}/`,
                  { credentials: 'include' }
                );
                if (memberRes.ok) {
                  const json = await memberRes.json();
                  setMembership(json?.data || json);
                }
              } catch { /* best-effort refresh */ }
            }
          }
        }}
      />

      {/* Video Preview Modal (click-to-enlarge) */}
      {videoPreviewUrl && (
        <div
          onClick={() => setVideoPreviewUrl(null)}
          className={s.videoModalOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={s.videoModalContent}
          >
            <video
              src={videoPreviewUrl}
              style={{ width: '100%', maxHeight: 'calc(100vh - 80px)', objectFit: 'contain', borderRadius: '12px' }}
              controls
              autoPlay
              loop
              playsInline
            />
            <button
              onClick={() => setVideoPreviewUrl(null)}
              className={s.videoModalClose}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
