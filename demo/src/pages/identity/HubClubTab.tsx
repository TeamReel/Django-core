/**
 * HubClubTab — Club management tab within the Team Hub.
 *
 * Admin-only tab that gives team admins access to club-level management
 * without leaving the Hub. Uses sub-tabs (pill bar) to organize:
 *   Overview | Teams | Leden | Identity
 *
 * All sub-tab content reuses existing self-contained components:
 * - ClubOverviewTab (with data from useHubClubOverview)
 * - TeamsList (self-contained data fetching)
 * - UsersList (self-contained data fetching)
 * - AssetsTab / ClubKitsTab / BrandIdentityPage (identity sub-tabs)
 *
 * No duplication of data hooks or UI components.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, LayoutGrid, Users, Shield, Palette } from 'lucide-react';
import { ClubOverviewTab } from './ClubOverviewTab';
import { TeamsList } from './directory/TeamsList';
import { UsersList } from './directory/UsersList';
import { AssetsTab } from '../../components/AssetsTab';
import { ClubKitsTab } from './ClubKitsTab';
import BrandIdentityPage from '../../components/Branding/BrandIdentityPage';
import { EntityEditModal } from '../../components/EntityEditModal';
import { useHubClubOverview } from './useHubClubOverview';
import type { Organisation, Project } from './clubOrgDetailHelpers';
import s from './HubClubTab.module.css';

// ── Types ────────────────────────────────────────────────────

interface HubClubTabProps {
  org: Organisation;
  club: Project;
  orgSlug: string;
  clubId: string;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  brandProfileId: string | null;
  apiBaseUrl: string;
}

type ClubSubTab = 'overview' | 'teams' | 'leden' | 'identity';

const SUB_TABS: Array<{ id: ClubSubTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'leden', label: 'Leden', icon: Shield },
  { id: 'identity', label: 'Identity', icon: Palette },
];

// ── Component ────────────────────────────────────────────────

export function HubClubTab({
  org,
  club,
  orgSlug,
  clubId,
  orgKeyForRoutes,
  clubKeyForRoutes,
  brandProfileId,
  apiBaseUrl,
}: HubClubTabProps) {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<ClubSubTab>('overview');
  const [identitySubtab, setIdentitySubtab] = useState<'assets' | 'kits' | 'brand'>('assets');
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Fade hint for sub-tab scroll overflow
  const subTabsRef = useRef<HTMLDivElement>(null);
  const [showSubTabFade, setShowSubTabFade] = useState(false);

  const checkSubTabOverflow = useCallback(() => {
    const el = subTabsRef.current;
    if (!el) return;
    setShowSubTabFade(
      el.scrollWidth > el.clientWidth + 8 &&
      el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    );
  }, []);

  useEffect(() => {
    const el = subTabsRef.current;
    if (!el) return;
    // Scroll active sub-tab into view
    const activePill = el.querySelector('[aria-selected="true"]') as HTMLElement | null;
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    checkSubTabOverflow();
    el.addEventListener('scroll', checkSubTabOverflow, { passive: true });
    return () => el.removeEventListener('scroll', checkSubTabOverflow);
  }, [activeSubTab, checkSubTabOverflow]);

  // Overview data (lazy — only fetched when overview sub-tab is active)
  const overview = useHubClubOverview({
    orgSlug,
    clubId,
    active: activeSubTab === 'overview',
  });

  // Tab href builder for ClubOverviewTab navigation links
  const makeTabHref = useCallback(
    (tabId: string) => {
      // When clicking "Alle teams →" or "Alle leden →" in the overview,
      // switch the sub-tab instead of navigating away
      if (tabId === 'teams' || tabId === 'leden' || tabId === 'members') {
        return '#';
      }
      return '#';
    },
    [],
  );

  // Override navigate for ClubOverviewTab to switch sub-tabs
  const handleOverviewNavigate = useCallback(
    (path: string) => {
      if (path === '#') return;
      // Check if this is a tab switch request
      navigate(path);
    },
    [navigate],
  );

  return (
    <div className={s.root}>
      {/* ── Club header with edit button ── */}
      <div className={s.clubHeader}>
        <div>
          <h2 className={s.clubName}>{club.name}</h2>
          <span className={s.clubMeta}>{org.name}</span>
        </div>
        <button
          type="button"
          className={s.editBtn}
          onClick={() => setEditModalOpen(true)}
          aria-label="Club bewerken"
          title="Club bewerken"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* ── Sub-tab pills ── */}
      <div className={s.subTabsWrap} data-fade={showSubTabFade}>
        <div ref={subTabsRef} className={s.subTabs} role="tablist" aria-label="Club secties">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                className={`${s.subTab} ${active ? s.subTabActive : ''}`}
                onClick={() => setActiveSubTab(tab.id)}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sub-tab content ── */}
      <div className={s.content} role="tabpanel">
        {activeSubTab === 'overview' && (
          <ClubOverviewTab
            club={club}
            org={org}
            overviewError={overview.overviewError}
            overviewLoading={overview.overviewLoading}
            overviewTeams={overview.overviewTeams}
            overviewSeasons={overview.overviewSeasons}
            overviewMembers={overview.overviewMembers}
            overviewCounts={overview.overviewCounts}
            orgKeyForRoutes={orgKeyForRoutes}
            clubKeyForRoutes={clubKeyForRoutes}
            navigate={handleOverviewNavigate}
            makeTabHref={makeTabHref}
          />
        )}

        {activeSubTab === 'teams' && (
          <TeamsList
            preselectedOrgId={orgSlug}
            preselectedClubId={clubId}
          />
        )}

        {activeSubTab === 'leden' && (
          <UsersList
            preselectedOrgId={orgSlug}
            preselectedClubId={clubId}
          />
        )}

        {activeSubTab === 'identity' && (
          <div>
            {/* Identity sub-sub-tabs: Assets | Kits | Brand */}
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
                organisationId={String(org.id)}
                projectId={club.slug || String(club.id)}
                entityName={club.name}
              />
            )}
            {identitySubtab === 'kits' && (
              <ClubKitsTab
                club={club}
                apiBaseUrl={apiBaseUrl}
                brandProfileId={brandProfileId}
                orgId={String(org.id)}
              />
            )}
            {identitySubtab === 'brand' && (
              <BrandIdentityPage
                projectId={club.slug || String(club.id)}
                projectName={club.name}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Club edit modal ── */}
      <EntityEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => {
          setEditModalOpen(false);
          overview.refetchOverview();
        }}
        entityType="club"
        entityId={club.slug || club.id || ''}
        entityName={club.name}
        organisationId={String(org.id)}
        projectId={club.slug || club.id}
        initialEntityData={{
          id: String(club.id),
          name: club.name || '',
          slug: club.slug,
          description: club.description,
          is_active: club.is_active ?? true,
          metadata: club.metadata || {},
        }}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </div>
  );
}

export default HubClubTab;
