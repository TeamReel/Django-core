/**
 * HubPageSheets — Bottom sheets, panels, and overlays for MyTeamHubPage.
 *
 * Extracted to keep the main page orchestrator under 500 LOC.
 * Contains: MatchSheetFlow, MemberSummarySheet, AssetDetailSheet,
 * Credits NavigationSheet, MemberDetailPanel overlay, Toast notifications.
 */
import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Wallet, ChevronRight } from 'lucide-react';
import { AppIcon } from '../../components/AppIcon';
import { MatchSheetFlow } from '../../components/dashboard/MatchSheetFlow';
import type { UseMatchSheetReturn } from '../../components/dashboard/useMatchSheet';
import type { Match } from '../../components/dashboard/ActiveMatchCard';
import { AssetDetailSheet, type AssetSheetType } from './AssetDetailSheet';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import { MemberDetailPanel } from '../periods/MemberDetailPanel';
import { formatCredits } from './detail/useTeamCreditsData';
import { iterVariants, ROLE_KIT_MAP, type TeamreelAssets } from '../../utils/assetMetadata';
import type { SquadMember } from '../periods/squadTabTypes';
import type { ProjectCreditsBalance } from '../../types/api/credits';
import type { SeasonProject, SeasonOrganisation } from '../../types/season';
import type { UseBrandProfileReturn } from '../../hooks/useBrandProfile';

import s from './HubPageSheets.module.css';

const MemberSummarySheet = React.lazy(() =>
  import('./MemberSummarySheet').then((m) => ({ default: m.MemberSummarySheet })),
);

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface HubPageSheetsProps {
  /* MatchSheetFlow */
  matchForSheet: Match | null;
  matchSheet: UseMatchSheetReturn;
  selectedMatch: unknown;
  setSelectedMatch: (m: null) => void;
  onNavigateToMatch: (tab?: string) => void;
  clubLogoUrl: string | undefined;

  /* MemberSummarySheet */
  selectedMember: SquadMember | null;
  setSelectedMember: (m: SquadMember | null) => void;
  members: SquadMember[];
  clubName: string | undefined;
  isAdmin: boolean;

  /* AssetDetailSheet */
  activeAssetSheet: AssetSheetType | null;
  setActiveAssetSheet: (t: AssetSheetType | null) => void;
  batchBrandKits: Record<string, string | null>;
  brandLogoUrl: string | null;
  brandSponsorUrl: string | null;
  memberAssetSummary: { complete: number; total: number };
  onNavigateToTab: (tab: string) => void;

  /* Credits NavigationSheet */
  creditsBalance: ProjectCreditsBalance | null;
  creditsSheetOpen: boolean;
  setCreditsSheetOpen: (open: boolean) => void;

  /* MemberDetailPanel */
  detailMemberId: string | null;
  setDetailMemberId: (id: string | null) => void;
  detailDefaultTab: string | undefined;
  setDetailDefaultTab: (tab: string | undefined) => void;
  project: SeasonProject | null;
  org: SeasonOrganisation | null;
  club: SeasonProject | null;
  apiBaseUrl: string;
  isTeamRoute: boolean;
  userCanEditProject: boolean;
  clubBrand: UseBrandProfileReturn;
  teamBrand: UseBrandProfileReturn | null;
  setMembersReloadToken: (fn: (t: number) => number) => void;

  /* Toasts */
  toasts: Toast[];
  dismissToast: (id: string) => void;
}

export const HubPageSheets: React.FC<HubPageSheetsProps> = ({
  matchForSheet,
  matchSheet,
  selectedMatch,
  setSelectedMatch,
  onNavigateToMatch,
  clubLogoUrl,
  selectedMember,
  setSelectedMember,
  members,
  clubName,
  isAdmin,
  activeAssetSheet,
  setActiveAssetSheet,
  batchBrandKits,
  brandLogoUrl,
  brandSponsorUrl,
  memberAssetSummary,
  onNavigateToTab,
  creditsBalance,
  creditsSheetOpen,
  setCreditsSheetOpen,
  detailMemberId,
  setDetailMemberId,
  detailDefaultTab,
  setDetailDefaultTab,
  project,
  org,
  club,
  apiBaseUrl,
  isTeamRoute,
  userCanEditProject,
  clubBrand,
  teamBrand,
  setMembersReloadToken,
  toasts,
  dismissToast,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const panelSourceMemberRef = useRef<SquadMember | null>(null);
  const PANEL_CLOSE_MS = 200;

  // ── Member navigation ──
  const selectedMemberIndex = useMemo(() => {
    if (!selectedMember) return -1;
    return members.findIndex((m) => String(m.id) === String(selectedMember.id));
  }, [selectedMember, members]);

  const handleMemberPrev = useCallback(() => {
    if (selectedMemberIndex > 0)
      setSelectedMember(members[selectedMemberIndex - 1]);
  }, [selectedMemberIndex, members, setSelectedMember]);

  const handleMemberNext = useCallback(() => {
    if (selectedMemberIndex >= 0 && selectedMemberIndex < members.length - 1)
      setSelectedMember(members[selectedMemberIndex + 1]);
  }, [selectedMemberIndex, members, setSelectedMember]);

  // Count members with processed closeup photo
  const membersWithPhoto = useMemo(() => {
    return members.filter((m) => {
      const assets = (m.metadata as Record<string, unknown> | undefined)
        ?.teamreel_assets as TeamreelAssets | undefined;
      if (!assets) return false;
      const funcRoles = (m as Record<string, unknown>).functional_roles as string[] | undefined;
      const primaryRole = funcRoles?.[0] ?? 'player';
      const allowedKits = ROLE_KIT_MAP[primaryRole]?.kits ?? ['home', 'away', 'third'];
      return allowedKits.some((kit) => {
        const variants = iterVariants(assets, primaryRole, 'images', 'closeup', kit);
        return variants.some((v) => typeof v.value?.processed === 'string' && v.value.processed);
      });
    }).length;
  }, [members]);

  // ── Member detail panel: animated close ──
  const handleClosePanel = useCallback(() => {
    const returnMember = panelSourceMemberRef.current;
    panelSourceMemberRef.current = null;
    const close = () => {
      setDetailMemberId(null);
      if (returnMember) setSelectedMember(returnMember);
    };
    const usesMotion = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!usesMotion) { close(); return; }
    setPanelClosing(true);
    setTimeout(() => { setPanelClosing(false); close(); }, PANEL_CLOSE_MS);
  }, [setDetailMemberId, setSelectedMember]);

  // Scroll lock when member detail panel is open
  useEffect(() => {
    if (!detailMemberId) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [detailMemberId]);

  // Focus trap inside member detail panel
  useEffect(() => {
    if (!detailMemberId || !panelRef.current) return;
    const panel = panelRef.current;
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const first = panel.querySelector<HTMLElement>(sel);
    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = panel.querySelectorAll<HTMLElement>(sel);
      if (!els.length) return;
      const f = els[0], l = els[els.length - 1];
      if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
      else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [detailMemberId]);

  return (
    <>
      {/* ── Match sheet ── */}
      {matchForSheet && (
        <MatchSheetFlow
          isOpen={matchSheet.sheetOpen}
          onClose={() => { matchSheet.closeSheet(); setSelectedMatch(null); }}
          match={matchForSheet}
          sheet={matchSheet}
          onNavigateToMatch={onNavigateToMatch}
          clubLogoUrl={clubLogoUrl}
        />
      )}

      {/* ── Member summary sheet ── */}
      <React.Suspense fallback={null}>
        <MemberSummarySheet
          member={selectedMember}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          clubName={clubName}
          onViewProfile={() => {
            panelSourceMemberRef.current = selectedMember ?? null;
            setDetailMemberId(String(selectedMember?.id ?? ''));
            setSelectedMember(null);
          }}
          onEdit={isAdmin ? (m: SquadMember, tab?: string) => {
            panelSourceMemberRef.current = m;
            setSelectedMember(null);
            setDetailDefaultTab(tab);
            setDetailMemberId(String(m.id ?? ''));
          } : undefined}
          onPrev={handleMemberPrev}
          onNext={handleMemberNext}
          hasPrev={selectedMemberIndex > 0}
          hasNext={selectedMemberIndex >= 0 && selectedMemberIndex < members.length - 1}
          currentIndex={selectedMemberIndex >= 0 ? selectedMemberIndex : undefined}
          totalCount={members.length > 0 ? members.length : undefined}
          membersWithPhoto={membersWithPhoto}
        />
      </React.Suspense>

      {/* ── Asset detail sheet ── */}
      <AssetDetailSheet
        isOpen={!!activeAssetSheet}
        onClose={() => setActiveAssetSheet(null)}
        type={activeAssetSheet}
        batchBrandKits={batchBrandKits}
        logoUrl={brandLogoUrl}
        sponsorUrl={brandSponsorUrl}
        memberSummary={memberAssetSummary}
        members={members}
        onNavigateToTab={(tab) => {
          setActiveAssetSheet(null);
          onNavigateToTab(tab);
        }}
      />

      {/* ── Credits balance sheet ── */}
      <NavigationSheet
        isOpen={creditsSheetOpen}
        onClose={() => setCreditsSheetOpen(false)}
        title="Credits & saldo"
        icon={<AppIcon icon={Wallet} size={18} />}
      >
        {creditsBalance ? (
          <div className={s.creditsSheet}>
            <div className={s.creditsRow}>
              <span className={s.creditsRowLabel}>Toegekend</span>
              <span className={s.creditsRowValue}>{formatCredits(creditsBalance.allocated_credits)}</span>
            </div>
            <div className={s.creditsRow}>
              <span className={s.creditsRowLabel}>Verbruikt</span>
              <span className={s.creditsRowValue}>{formatCredits(creditsBalance.used_credits)}</span>
            </div>
            <div className={`${s.creditsRow} ${s.creditsRowTotal}`}>
              <span className={s.creditsRowLabel}>Resterend</span>
              <span className={s.creditsRowValue}>{formatCredits(creditsBalance.remaining_credits)}</span>
            </div>
            <button
              type="button"
              className={s.creditsLink}
              onClick={() => { setCreditsSheetOpen(false); onNavigateToTab('beheer'); }}
            >
              Volledig overzicht bekijken
              <AppIcon icon={ChevronRight} size={14} />
            </button>
          </div>
        ) : (
          <div className={s.creditsSheet}>
            <p className={s.creditsEmpty}>Geen balansgegevens beschikbaar.</p>
          </div>
        )}
      </NavigationSheet>

      {/* ── Member detail panel overlay ── */}
      {(detailMemberId || panelClosing) && (
        <>
          <div
            className={`${s.memberPanelBackdrop} ${panelClosing ? s.memberPanelBackdropClosing : ''}`}
            onClick={handleClosePanel}
          />
          <div
            ref={panelRef}
            className={`${s.memberPanelOverlay} ${panelClosing ? s.memberPanelOverlayClosing : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Lid bewerken"
          >
            <MemberDetailPanel
              membershipId={detailMemberId!}
              memberIds={members.map((m) => String(m.id))}
              project={project}
              org={org}
              club={club}
              apiBaseUrl={apiBaseUrl}
              isTeamRoute={isTeamRoute}
              userCanEditProject={userCanEditProject}
              clubBrand={clubBrand}
              teamBrand={teamBrand}
              batchBrandKits={batchBrandKits}
              defaultTab={detailDefaultTab}
              onClose={handleClosePanel}
              onNavigate={(mid) => { setDetailDefaultTab(undefined); setDetailMemberId(mid); }}
              onMemberUpdated={() => setMembersReloadToken((t: number) => t + 1)}
              backLabel={panelSourceMemberRef.current ? 'Overzicht' : undefined}
            />
          </div>
        </>
      )}

      {/* ── Toast notifications ── */}
      {toasts.length > 0 && (
        <div className={s.toastContainer}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={s.toast}
              style={{
                background:
                  toast.type === 'success' ? 'var(--color-green-800)'
                    : toast.type === 'error' ? 'var(--color-red-800)'
                      : toast.type === 'warning' ? 'var(--color-amber-700)'
                        : 'var(--color-blue-800)',
              }}
            >
              <span className="flex-1">{toast.message}</span>
              <button type="button" aria-label="Melding sluiten" onClick={() => dismissToast(toast.id)} className={s.toastDismiss}>
                {'\u2715'}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
