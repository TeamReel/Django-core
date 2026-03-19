import React from 'react';
import { Alert, Badge, Card } from '@django-core/design-system';
import type { MemberTabCommonProps } from './memberDetailUtils';
import { getUserDisplayName } from './memberDetailUtils';
import s from './ProjectSeasonMemberDetailPage.module.css';
import m from './MemberInputTab.module.css';

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
            <span className={s.tabIcon}></span>
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
            <div className={`fs-13 fw-700 ${m.photoSectionLabel}`}>Profielfoto</div>
            <div className={s.photoThumbnailSquare}>
              {(profilePreview || form.profile?.url || membership?.user?.avatar_url) ? (
                <img
                  src={profilePreview || form.profile?.url || membership?.user?.avatar_url}
                  alt={getUserDisplayName(membership)}
                  className={`${s.mediaCoverFill} ${m.photoImg}`}
                  data-uploading={profileUploading}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className={m.emptyPlaceholder}></div>
              )}
            </div>
            {(profilePreview || form.profile?.url || membership?.user?.avatar_url) && (
              <div className="fs-11 text-success fw-600 mb-8">✓ Ingesteld</div>
            )}
            <div
              onClick={() => userCanEditProject && !profileUploading && profileInputRef.current?.click()}
              className={`${s.uploadDropZone} ${m.uploadZoneOuter}`}
              data-editable={userCanEditProject}
              data-uploading={profileUploading}
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
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfilePhotoUpload(file);
                  e.target.value = '';
                }}
              />
              {profileUploading ? (
                <div className="fs-12 fw-600">Uploaden...</div>
              ) : (
                <>
                  <div className="fs-24 mb-4"></div>
                  <div className="fs-11 fw-600">Upload / Vervang</div>
                </>
              )}
            </div>
          </div>

          {/* Legacy Photo */}
          <div>
            <div className={`fs-13 fw-700 ${m.photoSectionLabel}`}>Legacy Foto</div>
            <div className={s.photoThumbnailSquare}>
              {(legacyPhotoPreview || form.legacy_photo?.url) ? (
                <img
                  src={legacyPhotoPreview || resolveDisplayUrl(form.legacy_photo?.url) || undefined}
                  alt="Legacy Photo"
                  className={`${s.mediaCoverFill} ${m.photoImg}`}
                  data-uploading={legacyPhotoUploading}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className={m.emptyPlaceholder}></div>
              )}
            </div>
            {(legacyPhotoPreview || form.legacy_photo?.url) && (
              <div className="fs-11 text-success fw-600 mb-8">✓ Ingesteld</div>
            )}
            <div
              onClick={() => userCanEditProject && !legacyPhotoUploading && legacyPhotoInputRef.current?.click()}
              className={`${s.uploadDropZone} ${m.uploadZoneOuter}`}
              data-editable={userCanEditProject}
              data-uploading={legacyPhotoUploading}
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
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLegacyPhotoUpload(file);
                  e.target.value = '';
                }}
              />
              {legacyPhotoUploading ? (
                <div className="fs-12 fw-600">Uploaden...</div>
              ) : (
                <>
                  <div className="fs-24 mb-4"></div>
                  <div className="fs-11 fw-600">Upload / Vervang</div>
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
