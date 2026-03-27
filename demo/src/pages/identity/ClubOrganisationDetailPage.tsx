import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Pencil, Eye, Trash2, MoreHorizontal,
} from 'lucide-react';
import { ShareButton } from '../../components/ShareButton';

import { setActiveContext, getActiveContext } from '../../utils/activeContext';

import { api } from '@/api';

import MobileTabBar from '../../components/MobileTabBar';
import { useUserRole } from '../../components/PermissionGuards';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';

import { ClubOverviewTab } from './ClubOverviewTab';
import { TeamsList } from './directory/TeamsList';
import { UsersList } from './directory/UsersList';
import { AssetsTab } from '../../components/AssetsTab';
import { ClubKitsTab } from './ClubKitsTab';
import { AssetCompletionMatrix } from '../../components/AssetCompletionMatrix';
import BrandIdentityPage from '../../components/Branding/BrandIdentityPage';

import { useClubOrgDetailData } from './useClubOrgDetailData';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import s from './ClubOrganisationDetailPage.module.css';
import { useToast } from '@/components/ui/Toast';

/* ═══════════════════════════════════════════════════════════════
   ClubOrganisationDetailPage  —  Premium rebuild
   5 compact tabs: Overview | Teams | Members | Media | Identity
   Consistent with TeamOrganisationDetailPage layout
   ═══════════════════════════════════════════════════════════════ */

export default function ClubOrganisationDetailPage() {
  const { isPlayer, isSupporter } = useUserRole();
  const { pushToast } = useToast();
  const {
    org, club, loading, error, navigate, apiBaseUrl,
    activeContext, setActiveContextState, activatingContext, setActivatingContext,
    isProjectEditModalOpen, setIsProjectEditModalOpen,
    isProjectDetailModalOpen, setIsProjectDetailModalOpen,
    activeTabFromUrl, makeTabHref,
    orgIdForDirectoryLists, orgSlugForDirectoryLists,
    clubIdForDirectoryLists, orgKeyForRoutes, clubKeyForRoutes,
    backToOrgHref,
    overviewLoading, overviewError, overviewTeams, overviewSeasons, overviewMembers, overviewCounts,
    brandLogoUrl, brandProfileId,
    refetch,
  } = useClubOrgDetailData();

  const confirm = useConfirm();

  // ── Stack navigation: back arrow → federation ──
  useSetBackNavigation({ label: org?.name || 'Federatie', path: backToOrgHref });

  /* ── Overflow menu ── */
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  /* ── Identity sub-tab (Assets | Kits | Brand) ── */
  const [identitySubtab, setIdentitySubtab] = useState<'assets' | 'kits' | 'brand'>('assets');

  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.headerRow}>
          <div className={s.titleBlock}><h1>Club</h1></div>
        </div>
        <div className={s.skeleton}>
          <div className={s.skeletonBar} />
          <div className={s.skeletonBarShort} />
          <div className={s.skeletonBarFull} />
          <div className={s.skeletonCard} />
          <div className={s.skeletonCard} />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !org || !club) {
    return (
      <div className={s.page}>
        <div className={s.errorBox}>
          <div className={s.errorMsg}>{error || 'Club not found'}</div>
          <button type="button" className={s.backBtn} onClick={() => navigate(backToOrgHref)}>
            Terug
          </button>
        </div>
      </div>
    );
  }

  const isActive = !!club && String(((activeContext as Record<string, any>)?.club as Record<string, unknown>)?.id ?? '') === String(club.id ?? '');

  return (
    <>
      <div className={s.page}>
        {/* ── Header ── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <Link to={backToOrgHref} className={s.parentLink}>
              {org?.name || 'Federatie'}
            </Link>
            <h1>{club.name}</h1>
            <p>Club</p>
          </div>

          <div className={s.actions}>
            <button
              type="button"
              className={`${s.activeBtn} ${isActive ? s.activeBtnOn : ''}`}
              disabled={activatingContext || isActive}
              onClick={async () => {
                if (!club || isActive) return;
                try {
                  setActivatingContext(true);
                  await setActiveContext('club', String(club.id));
                  const context = await getActiveContext();
                  setActiveContextState(context);
                } finally {
                  setActivatingContext(false);
                }
              }}
              title="Stel deze club in als actieve context"
            >
              {isActive && <Check size={14} />}
              {isActive ? 'Actief' : 'Activeren'}
            </button>

            {!isPlayer && (
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setIsProjectEditModalOpen(true)}
                title="Bewerken"
              >
                <Pencil size={16} />
              </button>
            )}

            {/* Share link */}
            <ShareButton compact />

            <div className={s.overflowWrap} ref={overflowRef}>
              <button type="button" className={s.iconBtn} onClick={() => setOverflowOpen((v) => !v)} title="Meer" aria-label="Meer">
                <MoreHorizontal size={16} />
              </button>
              {overflowOpen && (
                <div className={s.overflowMenu}>
                  <button type="button" onClick={() => { setIsProjectDetailModalOpen(true); setOverflowOpen(false); }}>
                    <Eye size={14} /> Bekijken
                  </button>
                  <button type="button" onClick={() => { navigate(backToOrgHref); setOverflowOpen(false); }}>
                    <Eye size={14} /> Terug naar federatie
                  </button>
                  {!isPlayer && (
                    <button
                      type="button"
                      className={s.overflowDanger}
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Club verwijderen',
                          message: `Weet je zeker dat je club ${club.name} wilt verwijderen?`,
                          variant: 'danger',
                          confirmLabel: 'Verwijderen',
                        });
                        if (!ok) return;
                        try {
                          await api.delete(`/projects/${encodeURIComponent(String(club.id))}/`);
                          navigate(backToOrgHref);
                        } catch {
                          pushToast({ message: 'Kon club niet verwijderen', type: 'error' });
                        }
                        setOverflowOpen(false);
                      }}
                    >
                      <Trash2 size={14} /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'teams', label: 'Teams' },
            ...(!isSupporter ? [{ id: 'members', label: 'Members' }] : []),
            ...(!isSupporter ? [{ id: 'media', label: 'Media' }] : []),
            ...(!isPlayer && !isSupporter ? [{ id: 'identity', label: 'Identity' }] : []),
          ]}
          activeTab={activeTabFromUrl}
        />

        {/* ── Tab Content ── */}
        <div className={s.tabContent}>
          {activeTabFromUrl === 'overview' && (
            <ClubOverviewTab
              club={club} org={org}
              overviewError={overviewError} overviewLoading={overviewLoading}
              overviewTeams={overviewTeams} overviewSeasons={overviewSeasons}
              overviewMembers={overviewMembers} overviewCounts={overviewCounts}
              orgKeyForRoutes={orgKeyForRoutes} clubKeyForRoutes={clubKeyForRoutes}
              navigate={navigate} makeTabHref={makeTabHref}
            />
          )}

          {activeTabFromUrl === 'teams' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <TeamsList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'members' && orgSlugForDirectoryLists && clubIdForDirectoryLists && (
            <UsersList preselectedOrgId={orgSlugForDirectoryLists} preselectedClubId={clubIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'media' && club && orgIdForDirectoryLists && (
            <AssetCompletionMatrix
              projectId={club.slug || String(club.id)}
              entityName={club.name}
              title="Asset Completion Matrix"
            />
          )}

          {activeTabFromUrl === 'identity' && club && orgIdForDirectoryLists && (
            <div>
              <div className={s.identityToggle}>
                <button
                  type="button"
                  className={`${s.identityToggleBtn} ${identitySubtab === 'assets' ? s.identityToggleBtnActive : ''}`}
                  onClick={() => setIdentitySubtab('assets')}
                >
                  Assets
                </button>
                <button
                  type="button"
                  className={`${s.identityToggleBtn} ${identitySubtab === 'kits' ? s.identityToggleBtnActive : ''}`}
                  onClick={() => setIdentitySubtab('kits')}
                >
                  Kits
                </button>
                <button
                  type="button"
                  className={`${s.identityToggleBtn} ${identitySubtab === 'brand' ? s.identityToggleBtnActive : ''}`}
                  onClick={() => setIdentitySubtab('brand')}
                >
                  Brand
                </button>
              </div>
              {identitySubtab === 'assets' && (
                <AssetsTab
                  level="club"
                  organisationId={String(orgIdForDirectoryLists)}
                  projectId={club.slug || String(club.id)}
                  entityName={club.name}
                />
              )}
              {identitySubtab === 'kits' && (
                <ClubKitsTab club={club} apiBaseUrl={apiBaseUrl} brandProfileId={brandProfileId} orgId={String(orgIdForDirectoryLists)} />
              )}
              {identitySubtab === 'brand' && (
                <BrandIdentityPage projectId={club.slug || String(club.id)} projectName={club.name} />
              )}
            </div>
          )}
        </div>
      </div>

      <ProjectDetailModal
        opened={isProjectDetailModalOpen}
        onClose={() => setIsProjectDetailModalOpen(false)}
        project={club as unknown as import('@/types/api/project').Project}
      />

      <EntityEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSaved={() => refetch()}
        entityType="club"
        entityId={club?.slug || club?.id || ''}
        entityName={club?.name}
        organisationId={String(org?.id || '')}
        projectId={club?.slug || club?.id}
        initialEntityData={club ? {
          id: String(club.id), name: club.name || '', slug: club.slug,
          description: club.description, is_active: club.is_active ?? true,
          metadata: club.metadata || {},
        } : undefined}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </>
  );
}
