/**
 * MemberDetailPanel — Inline slide-in panel for member detail within SeasonMediaTab.
 *
 * Shows member assets, intro, celebration, actiefoto tabs with full editing.
 * Supports < > navigation between members.
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Badge, Button, Card } from '@django-core/design-system';

import { unwrapEnvelope as unwrap } from '../../types/season';
import { projectsApi } from '@/api';
import { useMemberMediaActions } from './useMemberMediaActions';
import { MemberAiModal, type MemberAiModalHandle } from './MemberAiModal';
import { MemberAssetsTab } from './MemberAssetsTab';
import { MemberIntroTab } from './MemberIntroTab';
import { MemberCelebrationTab } from './MemberCelebrationTab';
import { MemberActionPhotoTab } from './MemberActionPhotoTab';
import { MemberThenVsNowTab } from './MemberThenVsNowTab';
import { getUserDisplayName, mergeAssetsIntoMetadata } from './memberDetailUtils';
import type { AssetVariantsMap, MembershipRecord } from './memberDetailUtils';
import type { MemberMediaForm } from '../../constants/mediaSlots';
import type { UseBrandProfileReturn } from '../../hooks/useBrandProfile';
import type { SeasonProject, SeasonOrganisation } from '../../types/season';
import type { ProjectMembership } from '../../types/api/project';
import { ROLE_KIT_MAP } from '../../utils/assetMetadata';
import styles from './MemberDetailPanel.module.css';
import s from './ProjectSeasonMemberDetailPage.module.css';
import { logger } from '@/utils/logger';

const ROLE_LABELS: Record<string, string> = {
  player: 'Speler',
  keeper: 'Keeper',
  coach: 'Coach',
  assistant: 'Assistent',
  verzorger: 'Verzorger',
  supporter: 'Supporter',
  manager: 'Manager',
};

/** Derive functional roles from the membership, falling back to the primary role. */
function getMemberRoles(m: MembershipRecord | null): string[] {
  if (!m) return ['player'];
  if (m.functional_roles?.length) return m.functional_roles;
  if (m.role === 'goalkeeper') return ['keeper'];
  if (m.role) return [m.role];
  return ['player'];
}

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
  project: SeasonProject | null;
  org: SeasonOrganisation | null;
  club: SeasonProject | null;
  apiBaseUrl: string;
  isTeamRoute: boolean;
  userCanEditProject: boolean;
  clubBrand: UseBrandProfileReturn;
  teamBrand: UseBrandProfileReturn | null;
  batchBrandKits: Record<string, string | null>;
  onClose: () => void;
  onNavigate: (membershipId: string) => void;
  /** Called after save so media tab can refresh */
  onMemberUpdated?: () => void;
  /** Tab to open initially (Assets, Intro, Celebration, Actiefoto) */
  defaultTab?: string;
  /** When set, shows a back-arrow button with this label (e.g. "Overzicht") */
  backLabel?: string;
}

const PANEL_TABS = [
  { id: 'assets', label: 'Assets' },
  { id: 'intro', label: 'Intro' },
  { id: 'celebration', label: 'Celebration' },
  { id: 'then_vs_now', label: 'Then vs Now' },
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
  defaultTab,
  backLabel,
}) => {
  const [membership, setMembership] = useState<MembershipRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab || 'assets');
  const [selectedRole, setSelectedRole] = useState<string>('player');
  const [saving, setSaving] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  useEscapeKey(onClose);

  // Derive roles from membership
  const memberRoles = useMemo(() => getMemberRoles(membership), [membership]);
  const showRoleTabs = memberRoles.length > 1;

  // Reset selectedRole when membership changes
  useEffect(() => {
    if (memberRoles.length > 0 && !memberRoles.includes(selectedRole)) {
      setSelectedRole(memberRoles[0]);
    }
  }, [memberRoles]); // eslint-disable-line react-hooks/exhaustive-deps -- adding selectedRole would cause circular updates

  // AI modal
  const aiModalRef = useRef<MemberAiModalHandle | null>(null);
  const openAiModal = useCallback((templateId: string, defaultKitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null, referenceOverride?: string | null) => {
    aiModalRef.current?.open(templateId, defaultKitType, playerInTenueUrl, styleVariant, referenceOverride);
  }, []);

  // Effective kits from brand — filtered by selected role
  const allKits = useMemo(() =>
    KIT_ROLE_META.map(role => ({ id: role.id, label: role.label, icon: role.icon, url: batchBrandKits[role.id] ?? null })),
    [batchBrandKits],
  );
  const effectiveKits = useMemo(() => {
    const roleConfig = ROLE_KIT_MAP[selectedRole];
    if (!roleConfig?.kits.length) return allKits; // roles without kit config show all kits
    const allowedKits = new Set(roleConfig.kits);
    return allKits.filter(k => allowedKits.has(k.id));
  }, [allKits, selectedRole]);

  // Fetch membership data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMembership(null);

    const run = async () => {
      try {
        if (!project?.id || !membershipId) return;
        const json = await projectsApi.getMember(project.id, membershipId) as unknown as MembershipRecord;
        if (!cancelled) setMembership(json);
      } catch (e) {
        logger.error('Failed to load membership', e);
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
    membership, setMembership, membershipId, project: project as { id: string; organisation?: { id: string }; [k: string]: unknown } | null, org, apiBaseUrl,
  });

  // Save
  const handleSave = useCallback(async () => {
    if (!membership || !project || !userCanEditProject) return;
    setSaving(true);
    try {
      const nextMetadata = mergeAssetsIntoMetadata(membership?.metadata, media.form, media.videoVariants);
      const updated = await projectsApi.updateMember(project.id, membership.id!, { metadata: nextMetadata } as Partial<ProjectMembership>) as unknown as MembershipRecord;
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

  // Tab props (only used inside the `membership &&` guard, so non-null assertion is safe)
  const tabCommonProps = {
    membership: membership!,
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
    selectedRole,
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
          {backLabel && (
            <button type="button" className={styles.backBtn} onClick={onClose} title={backLabel}>
              <ArrowLeft size={16} />
              <span>{backLabel}</span>
            </button>
          )}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Sluiten" title="Sluiten">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Role tabs (only for multi-role members) ── */}
      {showRoleTabs && (
        <div className={styles.roleTabBar} role="tablist" aria-label="Rol selectie">
          {memberRoles.map((role) => (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={selectedRole === role}
              className={styles.roleTabBtn}
              data-active={selectedRole === role ? 'true' : undefined}
              onClick={() => setSelectedRole(role)}
            >
              {ROLE_LABELS[role] || role}
            </button>
          ))}
        </div>
      )}

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
            {activeTab === 'then_vs_now' && <MemberThenVsNowTab {...tabCommonProps} />}
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
          selectedRole={selectedRole}
        />
      )}

      {/* Video preview overlay */}
      {videoPreviewUrl && (
        <div className={styles.videoOverlay} onClick={() => setVideoPreviewUrl(null)} role="presentation">
          <video src={videoPreviewUrl} controls autoPlay className={styles.videoPlayer} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default MemberDetailPanel;
