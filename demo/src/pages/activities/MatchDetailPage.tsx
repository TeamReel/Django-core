import { useState, useRef, useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Eye, Pencil, Trash2, Check, ArrowLeft, MoreHorizontal,
} from 'lucide-react';
import { ShareButton } from '../../components/ShareButton';
import { ReadinessRing } from '../../components/dashboard/ReadinessRing';
import { calculateMatchReadiness } from '../../utils/matchReadiness';
import { MatchOverviewTab, MatchContentTab, MatchLineupTab } from './match-detail';
import { MatchDetailPageModals } from './MatchDetailPageModals';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import MobileTabBar from '../../components/MobileTabBar';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { useMatchDetailData } from './useMatchDetailData';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import { routes } from '../../routes';
import styles from './MatchDetailPage.module.css';

export default function HierarchyMatchDetailPage() {
  const d = useMatchDetailData();
  const location = useLocation();

  /* ---- back navigation: smart source detection ---- */
  const cameFromDashboard = (location.state as { from?: string })?.from === 'dashboard';
  const backPath = cameFromDashboard ? routes.dashboard() : (d.seasonBasePath || d.seasonsBasePath || '/');
  const backLabel = cameFromDashboard ? 'Dashboard' : 'Seizoen';
  useSetBackNavigation({ label: backLabel, path: backPath });

  /* ---- sticky context bar: visible when header scrolls out of view ---- */
  const headerSentinel = useRef<HTMLDivElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  useEffect(() => {
    const el = headerSentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [d.loading, d.match]);

  /* ---- overflow menu ---- */
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  /* ---- readiness ring: derive done subtypes from media data ---- */
  /* Hook MUST be above early-return guards to keep hook count stable (React rules of hooks) */
  const readiness = useMemo(() => {
    if (!d.match) return { percent: 0, done: 0, total: 0 };
    const doneSubtypes = Object.keys(d.mediaBySubtype ?? {});
    return calculateMatchReadiness(doneSubtypes, d.match);
  }, [d.mediaBySubtype, d.match]);

  /* ---- loading / error / redirect guards ---- */

  if (d.loading) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skeletonBar} />
        <div className={styles.skeletonBarShort} />
        <div className={styles.skeletonBarFull} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    );
  }

  if (d.error || !d.match) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorMsg}>{d.error || 'Wedstrijd niet gevonden'}</div>
        <button className={styles.backBtn} onClick={() => d.navigate(-1)}>
          <ArrowLeft size={16} /> Terug
        </button>
      </div>
    );
  }

  if (d.pendingClubSlugResolve) return null;
  if (d.clubSlugRedirectTarget) return <Navigate to={d.clubSlugRedirectTarget} replace />;

  const { match } = d;

  /* ---- render ---- */

  return (
    <>
      <div className={styles.page}>
        {/* ── Sticky context bar (visible on scroll) ──── */}
        {stickyVisible && (
          <div className={styles.stickyContextBar}>
            <button className={styles.stickyBackBtn} onClick={() => d.navigate(backPath)}>
              <ArrowLeft size={14} />
              <span>{backLabel}</span>
            </button>
            <span className={styles.stickyTitle}>{match.title}</span>
          </div>
        )}

        {/* ── Match header ────────────────────────────────── */}
        <div ref={headerSentinel} className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <h1>{match.title}</h1>
          </div>

          {!d.matchMediaLoading && (
            <div className={styles.readinessRing}>
              <ReadinessRing
                percent={readiness.percent}
                size={56}
                aria-label={`Wedstrijd gereedheid: ${readiness.percent}% (${readiness.done} van ${readiness.total} items)`}
              />
            </div>
          )}

          <div className={styles.actions}>
            {/* Make active — always visible, primary action */}
            {(() => {
              const isActive = !!match && String((d.activeContext?.match as Record<string, unknown> | undefined)?.id ?? '') === String(match?.id ?? '');
              return (
                <button
                  type="button"
                  className={`${styles.activeBtn} ${isActive ? styles.activeBtnOn : ''}`}
                  disabled={d.activatingContext || isActive}
                  onClick={async () => {
                    if (!match || isActive) return;
                    try {
                      d.setActivatingContext(true);
                      await setActiveContext('match', String(match.id));
                      const ctx = await getActiveContext();
                      d.setActiveContextState(ctx);
                    } finally {
                      d.setActivatingContext(false);
                    }
                  }}
                  title="Stel deze wedstrijd in als actieve context"
                >
                  {isActive && <Check size={14} />}
                  {isActive ? 'Actief' : 'Activeren'}
                </button>
              );
            })()}

            {/* Edit (admin) */}
            {!d.isPlayer && (
              <button type="button" className={styles.iconBtn} onClick={() => d.setIsMatchEditModalOpen(true)} title="Bewerken" aria-label="Bewerken">
                <Pencil size={16} />
              </button>
            )}

            {/* Share + QR (match pages benefit from QR for match-day posters) */}
            <ShareButton showQR compact />

            {/* Overflow menu — View + Delete */}
            <div className={styles.overflowWrap} ref={overflowRef}>
              <button type="button" className={styles.iconBtn} onClick={() => setOverflowOpen((v) => !v)} title="Meer" aria-label="Meer">
                <MoreHorizontal size={16} />
              </button>
              {overflowOpen && (
                <div className={styles.overflowMenu}>
                  <button type="button" onClick={() => { d.setIsMatchDetailModalOpen(true); setOverflowOpen(false); }}>
                    <Eye size={14} /> Bekijken
                  </button>
                  {!d.isPlayer && (
                    <button type="button" className={styles.overflowDanger} onClick={() => { d.handleDeleteMatch(); setOverflowOpen(false); }}>
                      <Trash2 size={14} /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>


          </div>
        </div>

        <MatchDetailPageModals d={d} match={match} />

        {/* Mobile Tab Bar */}
        {/* RBAC: Supporter (Overview), Member (+ Lineup), Admin (all 4) */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            ...(!d.isPlayer && !d.isSupporter ? [{ id: 'content', label: 'Content' }] : []),
            ...(!d.isSupporter ? [{ id: 'lineup', label: 'Lineup' }] : []),

          ]}
          activeTab={d.activeTab}
        />

        <div className={styles.tabContent}>
          {d.activeTab === 'overview' && (
            <MatchOverviewTab
              match={match}
              org={d.org}
              competition={d.competition}
              teamDisplay={{
                isHome: d.isHome,
                homeTeamName: d.homeTeamName,
                awayTeamName: d.awayTeamName,
                homeLogoUrl: d.homeLogoUrl,
                awayLogoUrl: d.awayLogoUrl,
              }}
              scoreDisplay={d.scoreDisplay}
              status={d.status}
              date={d.date}
              homeParticipations={d.homeParticipations}
              awayParticipations={d.awayParticipations}
              matchEvents={d.matchEvents}
              getLatestMediaForSubtype={d.getLatestMediaForSubtype}
              getContentItemForSubtype={d.getContentItemForSubtype}
              onContentAction={(subtype, label) => {
                const latestMedia = d.getLatestMediaForSubtype(subtype);
                if (latestMedia) {
                  const previewUrl = latestMedia.file_url || getAssetUrl(latestMedia.storage_path);
                  if (previewUrl) {
                    const isVid = Boolean(latestMedia.mime_type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(previewUrl));
                    d.setSavedAssetPreview({ title: label, subtitle: 'Match media', url: previewUrl, isVideo: isVid });
                  }
                } else {
                  const templates = d.availableTemplates[subtype] || [];
                  let matched: import('../identity/ContentGenerationModal').ContentTemplate | undefined;
                  if ((subtype === 'lineup' || subtype === 'lineup_flyer') && templates.length > 0) {
                    const formation = match?.metadata?.formation;
                    if (formation) {
                      matched = templates.find(
                        (t) => t.formation_detail?.code === formation ||
                          t.name.toLowerCase().includes(formation.toLowerCase().replace(/-/g, ''))
                      );
                    }
                    if (!matched) matched = templates[0];
                  } else {
                    matched = templates[0];
                  }
                  d.openContentModal(matched, label);
                }
              }}
            />
          )}

          {d.activeTab === 'content' && (
            <MatchContentTab
              match={match}
              org={d.org}
              competition={d.competition}
              templatesLoading={d.templatesLoading}
              matchMediaLoading={d.matchMediaLoading}
              isContentModalOpen={d.isContentModalOpen}
              availableTemplates={d.availableTemplates}
              getLatestMediaForSubtype={d.getLatestMediaForSubtype}
              getMediaHistoryForSubtype={d.getMediaHistoryForSubtype}
              getContentItemForSubtype={d.getContentItemForSubtype}
              openContentModal={d.openContentModal}
              setSavedAssetPreview={d.setSavedAssetPreview}
              handleDeleteMediaItem={d.handleDeleteMediaItem}
              handleRestoreMediaItem={d.handleRestoreMediaItem}
            />
          )}

          {d.activeTab === 'lineup' && (
            <MatchLineupTab
              lineupFormation={d.lineupFormation}
              setLineupFormation={d.setLineupFormation}
              lineupSlots={d.lineupSlots}
              setLineupSlots={d.setLineupSlots}
              lineupSquad={d.lineupSquad}
              lineupSquadLoading={d.lineupSquadLoading}
              lineupBenchStatus={d.lineupBenchStatus}
              setLineupBenchStatus={d.setLineupBenchStatus}
              lineupSaving={d.lineupSaving}
              lineupSaveSuccess={d.lineupSaveSuccess}
              saveLineup={d.saveLineup}
            />
          )}
        </div>
      </div>
    </>
  );
}
