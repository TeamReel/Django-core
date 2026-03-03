import React from 'react';
import { Alert, Badge, Card } from '@django-core/design-system';
import type { MemberTabCommonProps } from './memberDetailUtils';
import { getUserDisplayName } from './memberDetailUtils';
import s from './ProjectSeasonMemberDetailPage.module.css';

export interface MemberInputTabProps extends MemberTabCommonProps {
  profilePreview: string | null;
  profileUploading: boolean;
  profileInputRef: React.RefObject<HTMLInputElement>;
  handleProfilePhotoUpload: (file: File) => void;
  legacyPhotoPreview: string | null;
  legacyPhotoUploading: boolean;
  legacyPhotoInputRef: React.RefObject<HTMLInputElement>;
  handleLegacyPhotoUpload: (file: File) => void;
}

export function MemberInputTab({
  membership,
  form,
  userCanEditProject,
  resolveDisplayUrl,
  profilePreview,
  profileUploading,
  profileInputRef,
  handleProfilePhotoUpload,
  legacyPhotoPreview,
  legacyPhotoUploading,
  legacyPhotoInputRef,
  handleLegacyPhotoUpload,
}: MemberInputTabProps) {
  return (
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
              <div style={{ fontSize: '11px', color: 'var(--app-success)', fontWeight: 600, marginBottom: '8px' }}>✓ Ingesteld</div>
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
              <div style={{ fontSize: '11px', color: 'var(--app-success)', fontWeight: 600, marginBottom: '8px' }}>✓ Ingesteld</div>
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
  );
}
