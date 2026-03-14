import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { api, projectsApi } from '@/api';
import type { SeasonProject as Project } from '../../types/season';
import { getUserDisplayName } from './memberDetailUtils';
import type { MembershipRecord } from './memberDetailUtils';
import s from './ProjectSeasonMemberDetailPage.module.css';
import styles from './MemberIdentityTab.module.css';
import { logger } from '@/utils/logger';
import { S3_ASSET_BASE_URL } from '@/hooks/brandProfileConstants';

export interface MemberIdentityTabProps {
  membership: MembershipRecord;
  project: Project | null;
  apiBaseUrl: string;
  onMembershipUpdate: (updated: MembershipRecord) => void;
}

export function MemberIdentityTab({
  membership,
  project,
  apiBaseUrl,
  onMembershipUpdate,
}: MemberIdentityTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPosition, setEditPosition] = useState('');
  const [editJerseyNumber, setEditJerseyNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settingAsProfilePhoto, setSettingAsProfilePhoto] = useState(false);

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
      const existingMeta = membership?.metadata || {};
      const newMeta = {
        ...existingMeta,
        position: editPosition.trim() || null,
        jersey_number: editJerseyNumber.trim() || null,
      };

      const updated = await projectsApi.updateMember(project.id, membership.id, { metadata: newMeta }) as Record<string, any>;
      onMembershipUpdate(updated);
      setIsEditing(false);
      setSuccess('Identity updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      logger.error('Failed to save member identity', e);
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleUseAsProfilePhoto = async () => {
    if (!profileMediaUrl) return;

    let path = profileMediaUrl;
    if (path.startsWith(S3_ASSET_BASE_URL)) {
      path = path.replace(S3_ASSET_BASE_URL, '');
    }

    setSettingAsProfilePhoto(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/auth/avatar/set-path/', { path });

      setSuccess('Profile photo updated! Refresh to see changes.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      logger.error('Failed to set profile photo', e);
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
          <Alert variant="error" className="mt-12">
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mt-12">
            {success}
          </Alert>
        )}

        <div className="mt-20">
          {/* Profile Photo Section */}
          <div className="mb-24">
            <div className={`${s.sectionTitle} mb-12`}>Profile Photo</div>
            <div className="flex-row items-start gap-20 flex-wrap">
              <div className={`rounded-12 overflow-hidden flex-center ${styles.profilePhotoContainer}`}>
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
                  <div className={styles.emptyAvatarIcon}>👤</div>
                )}
              </div>
              <div className={`flex-1 ${styles.infoColumn}`}>
                {membership?.user?.avatar_url ? (
                  <div className={s.flexCenterGap8}>
                    <span className="fs-13 text-success fw-600">✓ Profile photo set</span>
                  </div>
                ) : (
                  <div className={`fs-13 text-muted ${styles.noPhotoText}`}>
                    No profile photo set
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Media Profile Photo - If different from user avatar */}
          {profileMediaUrl && profileMediaUrl !== membership?.user?.avatar_url && (
            <div className={`mb-24 p-16 rounded-8 ${styles.mediaProfileSection}`}>
              <div className={`${s.sectionTitle} mb-12`}>Media Profile Photo</div>
              <div className="flex-row items-start gap-20 flex-wrap">
                <div className={`rounded-8 overflow-hidden flex-center bg-surface ${styles.mediaPhotoContainer}`}>
                  <img
                    src={profileMediaUrl}
                    alt="Media profile"
                    className={s.mediaCoverFill}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className={`flex-1 ${styles.infoColumn}`}>
                  <div className={`${s.formLabel} mb-8`}>
                    Photo from media slot (e.g., SoccerWiki import)
                  </div>
                  <div className={`py-8 px-12 bg-surface rounded-6 fs-11 word-break-all mb-12 ${styles.monoUrl}`}>
                    {profileMediaUrl}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleUseAsProfilePhoto}
                    disabled={settingAsProfilePhoto}
                  >
                    {settingAsProfilePhoto ? 'Setting...' : '→ Use as User Profile Photo'}
                  </Button>
                  <div className="fs-11 opacity-60 mt-8">
                    This will set your user account avatar to this photo.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Information Section */}
          <div className={s.sectionDivider}>
            <div className={`${s.sectionTitle} mb-12`}>User Information</div>
            <div className="grid-auto-fit gap-16">
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
          <div className={`${s.sectionDivider} mt-20`}>
            <div className={`${s.sectionTitle} mb-12`}>Role & Position</div>
            {isEditing ? (
              <div className="flex-col gap-16">
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
                    className={styles.jerseyInput}
                  />
                </div>
                <div className="flex-row gap-8 mt-8">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid-auto-fit gap-16">
                <div>
                  <div className={s.formLabel}>Role</div>
                  <Badge variant="default">{membership?.role || 'member'}</Badge>
                </div>
                <div>
                  <div className={s.formLabel}>Position</div>
                  <div className={s.fieldValue}>
                    {membership?.metadata?.position || membership?.position || '—'}
                  </div>
                </div>
                <div>
                  <div className={s.formLabel}>Jersey Number</div>
                  <div className={s.fieldValue}>
                    {membership?.metadata?.jersey_number || membership?.jersey_number || '—'}
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
