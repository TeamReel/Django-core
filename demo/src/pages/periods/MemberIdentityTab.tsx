import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import type { SeasonProject as Project } from '../../types/season';
import { getUserDisplayName } from './memberDetailUtils';
import s from './ProjectSeasonMemberDetailPage.module.css';

export interface MemberIdentityTabProps {
  membership: any;
  project: Project | null;
  apiBaseUrl: string;
  onMembershipUpdate: (updated: any) => void;
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
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';

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
