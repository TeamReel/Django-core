/**
 * MemberDetailPanel — Inline slide-in panel for member detail within SeasonMediaTab.
 *
 * Shows member assets, intro, celebration, actiefoto tabs with full editing.
 * Supports < > navigation between members.
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { Badge, Button, Card } from '@django-core/design-system';

import { unwrapEnvelope as unwrap } from '../../types/season';
import { projectsApi } from '../../api';
import { useMemberMediaActions } from './useMemberMediaActions';
import { MemberAiModal, type MemberAiModalHandle } from './MemberAiModal';
import { MemberAssetsTab } from './MemberAssetsTab';
import { MemberIntroTab } from './MemberIntroTab';
import { MemberCelebrationTab } from './MemberCelebrationTab';
import { MemberActionPhotoTab } from './MemberActionPhotoTab';
import { getUserDisplayName, mergeAssetsIntoMetadata } from './memberDetailUtils';
import type { AssetVariantsMap } from './memberDetailUtils';
import type { MemberMediaForm } from '../../constants/mediaSlots';
import styles from './MemberDetailPanel.module.css';
import s from './ProjectSeasonMemberDetailPage.module.css';

const KIT_ROLE_META = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'away', label: 'Away', icon: 'plane' },
  { id: 'third', label: 'Third', icon: 'hash' },
  { id: 'goalkeeper', label: 'Keeper', icon: 'shield' },
];

export interface MemberDetailPanelProps {
  membershipId: string;
  /** Ordered list of all member IDs for navigation */
  memberIds: string[];
  project: any;
  org: any;
  club: any;
  apiBaseUrl: string;
  isTeamRoute: boolean;
  userCanEditProject: boolean;
  clubBrand: any;
  teamBrand: any;
  batchBrandKits: Record<string, string | null>;
  onClose: () => void;
  onNavigate: (membershipId: string) => void;
  /** Called after save so media tab can refresh */
  onMemberUpdated?: () => void;
}

const PANEL_TABS = [
  { id: 'assets', label: 'Assets' },
  { id: 'intro', label: 'Intro' },
  { id: 'celebration', label: 'Celebration' },
  { id: 'action_photo', label: 'Actiefoto' },
];

export const MemberDetailPanel: React.FC<MemberDetailPanelProps> = ({
  membershipId,
  memberIds,
  project,
  org,
  club,
  apiBaseUrl,
  isTeamRoute,
  userCanEditProject,
  clubBrand,
  teamBrand,
  batchBrandKits,
  onClose,
  onNavigate,
  onMemberUpdated,
}) => {
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('assets');
  const [saving, setSaving] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // AI modal
  const aiModalRef = useRef<MemberAiModalHandle | null>(null);
  const openAiModal = useCallback((templateId: string, defaultKitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null, referenceOverride?: string | null) => {
    aiModalRef.current?.open(templateId, defaultKitType, playerInTenueUrl, styleVariant, referenceOverride);
  }, []);

  // Effective kits from brand
  const effectiveKits = useMemo(() =>
    KIT_ROLE_META.map(role => ({ id: role.id, label: role.label, icon: role.icon, url: batchBrandKits[role.id] ?? null })),
    [batchBrandKits],
  );

  // Fetch membership data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMembership(null);

    const run = async () => {
      try {
        if (!project?.id || !membershipId) return;
        const json = await projectsApi.getMember(project.id, membershipId) as any;
        if (!cancelled) setMembership(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [apiBaseUrl, project?.id, membershipId]);

  // Media actions
  const media = useMemberMediaActions({
    membership, setMembership, membershipId, project, org, apiBaseUrl,
  });

  // Save
  const handleSave = useCallback(async () => {
    if (!membership || !project || !userCanEditProject) return;
    setSaving(true);
    try {
      const nextMetadata = mergeAssetsIntoMetadata(membership?.metadata, media.form, media.videoVariants);
      const updated = await projectsApi.updateMember(project.id, membership.id, { metadata: nextMetadata }) as any;
      setMembership(updated ? { ...membership, ...updated } : membership);
      onMemberUpdated?.();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [apiBaseUrl, membership, project, userCanEditProject, media.form, media.videoVariants, onMemberUpdated]);

  // Navigation
  const currentIndex = memberIds.indexOf(membershipId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < memberIds.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(memberIds[currentIndex - 1]);
  }, [hasPrev, currentIndex, memberIds, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(memberIds[currentIndex + 1]);
  }, [hasNext, currentIndex, memberIds, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) goPrev();
      if (e.key === 'ArrowRight' && hasNext) goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, hasPrev, hasNext, goPrev, goNext]);

  const memberName = membership ? getUserDisplayName(membership) : 'Laden...';

  // Tab props
  const tabCommonProps = {
    membership,
    form: media.form,
    videoVariants: media.videoVariants,
    setVideoVariants: media.setVideoVariants,
    setForm: media.setForm,
    userCanEditProject,
    apiBaseUrl,
    membershipId,
    project,
    resolveDisplayUrl: media.resolveDisplayUrl,
    openAiModal,
    handleMetadataUpdate: media.handleMetadataUpdate,
    startProcessingPoll: media.startProcessingPoll,
    setVideoPreviewUrl,
    setMembership,
    effectiveKits,
  };

  return (
    <div className={styles.panel}>
      {/* ── Header with nav ── */}
      <div className={styles.panelHeader}>
        <div className={styles.navRow}>
          <button
            type="button"
            className={styles.navBtn}
            disabled={!hasPrev}
            onClick={goPrev}
            title="Vorige member"
          >
            <ChevronLeft size={18} />
          </button>
          <span className={styles.navCounter}>
            {currentIndex + 1} / {memberIds.length}
          </span>
          <button
            type="button"
            className={styles.navBtn}
            disabled={!hasNext}
            onClick={goNext}
            title="Volgende member"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className={styles.headerInfo}>
          <div className={styles.memberName}>{memberName}</div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Sluiten">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Tab bar (local, no URL navigation) ── */}
      <div className={styles.tabBar}>
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={styles.tabBtn}
            data-active={activeTab === tab.id ? 'true' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className={styles.panelContent}>
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <div>Member laden...</div>
          </div>
        )}

        {error && <div className={styles.errorState}>{error}</div>}

        {!loading && !error && membership && (
          <>
            {activeTab === 'assets' && (
              <MemberAssetsTab
                {...tabCommonProps}
                croppingCloseup={media.croppingCloseup}
                cropCloseupFromFullbody={media.cropCloseupFromFullbody}
                croppingHalfbody={media.croppingHalfbody}
                cropHalfbodyFromFullbody={media.cropHalfbodyFromFullbody}
                org={org}
                club={club}
              />
            )}
            {activeTab === 'intro' && <MemberIntroTab {...tabCommonProps} />}
            {activeTab === 'celebration' && <MemberCelebrationTab {...tabCommonProps} />}
            {activeTab === 'action_photo' && <MemberActionPhotoTab {...tabCommonProps} />}
          </>
        )}
      </div>

      {/* ── AI Modal ── */}
      {membership && (
        <MemberAiModal
          aiModalRef={aiModalRef}
          membershipId={membershipId}
          membership={membership}
          project={project}
          org={org}
          club={club}
          isTeamRoute={isTeamRoute}
          apiBaseUrl={apiBaseUrl}
          clubBrand={clubBrand}
          teamBrand={teamBrand}
          batchBrandKits={batchBrandKits}
          form={media.form}
          setForm={media.setForm}
          videoVariants={media.videoVariants}
          setVideoVariants={media.setVideoVariants}
          resolveDisplayUrl={media.resolveDisplayUrl}
          setPresignedCache={media.setPresignedCache}
          handleMetadataUpdate={media.handleMetadataUpdate}
          setMembership={setMembership}
        />
      )}

      {/* Video preview overlay */}
      {videoPreviewUrl && (
        <div className={styles.videoOverlay} onClick={() => setVideoPreviewUrl(null)} role="button" tabIndex={0}>
          <video src={videoPreviewUrl} controls autoPlay className={styles.videoPlayer} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default MemberDetailPanel;
