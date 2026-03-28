import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Trophy, Wallet,
  Building2, Shirt, Upload, Settings,
  ChevronRight, ChevronDown,
} from 'lucide-react';
import { AppIcon } from '../../components/AppIcon';
import { getTeamAssetStatus } from '../../utils/assetStatus';
import type { SquadMember } from '../periods/squadTabTypes';
import type { MatchRecord } from '../periods/SeasonMatchesTab';
import type { AssetSheetType } from './AssetDetailSheet';
import type { SeasonOrganisation } from '../../types/season';

import s from './HubOverviewTab.module.css';

interface HubOverviewTabProps {
  matches: MatchRecord[];
  members: SquadMember[];
  competitionsCount: number;
  org: SeasonOrganisation | null;
  club: { name?: string } | null;
  season: { name?: string; start_date?: string; end_date?: string } | null;
  batchBrandKits: Record<string, string | null>;
  brandSponsorUrl: string | null | undefined;
  memberAssetSummary: { complete: number; total: number };
  isAdmin: boolean;
  userCanEditProject: boolean;
  orgIdForDirectoryLists: string;
  teamIdForDirectoryLists: string;
  creditsLabel: string | null;
  matchDisplayTitle: (m: MatchRecord) => string;
  onMatchTap: (m: MatchRecord) => void;
  onNavigateToTab: (tabId: string) => void;
  onAssetSheetOpen: (type: AssetSheetType) => void;
  onCreditsSheetOpen: () => void;
}

export const HubOverviewTab: React.FC<HubOverviewTabProps> = ({
  matches,
  members,
  competitionsCount,
  org,
  club,
  season,
  batchBrandKits,
  brandSponsorUrl,
  memberAssetSummary,
  isAdmin,
  userCanEditProject,
  orgIdForDirectoryLists,
  teamIdForDirectoryLists,
  creditsLabel,
  matchDisplayTitle,
  onMatchTap,
  onNavigateToTab,
  onAssetSheetOpen,
  onCreditsSheetOpen,
}) => {
  const navigate = useNavigate();

  // ── Accordion state (all sections default closed) ──
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([]));
  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Next match ──
  const nextMatch = useMemo<MatchRecord | null>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return matches
      .filter((m) => {
        const dt = m.start_time || m.date || m.metadata?.date;
        return dt && new Date(dt) >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.start_time || a.date || a.metadata?.date || 0).getTime();
        const db = new Date(b.start_time || b.date || b.metadata?.date || 0).getTime();
        return da - db;
      })[0] ?? null;
  }, [matches]);

  const fmtNextMatchDate = useMemo(() => {
    if (!nextMatch) return '';
    const raw = nextMatch.start_time || nextMatch.date || nextMatch.metadata?.date;
    if (!raw) return '';
    const dt = new Date(raw);
    return dt.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [nextMatch]);

  const nextMatchVenue = useMemo<'home' | 'away' | null>(() => {
    if (!nextMatch) return null;
    const meta = nextMatch.metadata as Record<string, unknown> | undefined;
    if (!meta) return null;
    if (meta.venue === 'home' || meta.venue === 'Home' || meta.is_home === true) return 'home';
    if (meta.venue === 'away' || meta.venue === 'Away' || meta.is_home === false) return 'away';
    const ctx = (meta.teamreel as Record<string, Record<string, unknown>> | undefined)?.match_context;
    if (ctx?.venue === 'Home' || ctx?.is_home === true) return 'home';
    if (ctx?.venue === 'Away' || ctx?.is_home === false) return 'away';
    return null;
  }, [nextMatch]);

  // ── Asset status ──
  const teamAssetStatus = useMemo(
    () => getTeamAssetStatus(batchBrandKits as Record<string, string | null>),
    [batchBrandKits],
  );
  const hasSponsor = Boolean(brandSponsorUrl);
  const hasAnyKit = useMemo(
    () => Object.values(batchBrandKits).some(Boolean),
    [batchBrandKits],
  );

  return (
    <>
      {/* Next match — compact row */}
      {nextMatch && (
        <button
          type="button"
          className={s.nextMatchRow}
          onClick={() => onMatchTap(nextMatch)}
        >
          {nextMatchVenue ? (
            <span className={nextMatchVenue === 'home' ? s.venueDotHome : s.venueDotAway} />
          ) : (
            <AppIcon icon={Calendar} size={14} className={s.nextMatchIcon} />
          )}
          <div className={s.nextMatchInfo}>
            <span className={s.nextMatchTitle}>{matchDisplayTitle(nextMatch)}</span>
            <span className={s.nextMatchDate}>{fmtNextMatchDate}</span>
          </div>
          <AppIcon icon={ChevronRight} size={14} className={s.nextMatchChevron} />
        </button>
      )}

      {/* Compact season info card */}
      {season && (
        <button
          type="button"
          className={s.seasonCompact}
          onClick={() => onNavigateToTab('wedstrijden')}
          aria-label={`Seizoen ${String(season.name || 'Seizoen')} bekijken`}
        >
          <div className={s.seasonCompactRow}>
            <span className={s.seasonCompactDot} />
            <span className={s.seasonCompactName}>{String(season.name || 'Seizoen')}</span>
          </div>
          <div className={s.seasonCompactStats}>
            <span>{matches.length} wedstrijden</span>
            <span>{'\u00B7'}</span>
            <span>{competitionsCount} competities</span>
            <span>{'\u00B7'}</span>
            <span>{members.length} leden</span>
          </div>
        </button>
      )}

      {/* Team info — open section with floating label */}
      <div className={s.sectionLabel}>Team info</div>
      <div className={s.accordionSection}>
        {org?.sport?.name && (
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Sport</span>
            <span className={s.infoValue}>{org.sport.name}</span>
          </div>
        )}
        {org?.name && (
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Bond</span>
            <span className={s.infoValue}>{org.name}</span>
          </div>
        )}
        {club?.name && (
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Club</span>
            <span className={s.infoValue}>{club.name}</span>
          </div>
        )}
        {season && (
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Seizoen</span>
            <span className={s.infoValue}>
              {String(season.name || '')}
              {season.start_date && season.end_date && (
                <span className={s.infoSub}>
                  {' '}({new Date(season.start_date).toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })}
                  {' '}&ndash; {new Date(season.end_date).toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })})
                </span>
              )}
            </span>
          </div>
        )}
        <div className={s.infoRow}>
          <span className={s.infoLabel}>Selectie</span>
          <span className={s.infoValue}>{members.length} leden</span>
        </div>
        <div className={s.infoRow}>
          <span className={s.infoLabel}>Competities</span>
          <span className={s.infoValue}>{competitionsCount}</span>
        </div>
        <div className={s.infoRow}>
          <span className={s.infoLabel}>Wedstrijden</span>
          <span className={s.infoValue}>{matches.length}</span>
        </div>
        {isAdmin && userCanEditProject && (
          <button
            type="button"
            className={s.accordionViewAll}
            onClick={() => navigate(`/organisations/${orgIdForDirectoryLists}/projects/${teamIdForDirectoryLists}/edit`)}
          >
            Team bewerken
          </button>
        )}
      </div>

      {/* Team assets — accordion */}
      <div className={s.sectionLabel}>Assets</div>
      <div className={s.accordionSection}>
        <button
          type="button"
          className={s.accordionHeader}
          onClick={() => toggleSection('team-assets')}
          aria-expanded={expandedSections.has('team-assets')}
          aria-label="Team assets"
        >
          <AppIcon icon={Shirt} size={18} className={s.accordionIcon} />
          <span className={s.accordionLabel}>Team assets</span>
          <AppIcon
            icon={ChevronDown}
            size={16}
            className={`${s.accordionChevron} ${expandedSections.has('team-assets') ? s.accordionChevronOpen : ''}`}
          />
        </button>
        <div className={`${s.accordionBody} ${expandedSections.has('team-assets') ? s.accordionBodyOpen : ''}`}>
          <div className={s.accordionBodyInner}>
            <button type="button" className={s.accordionItem} onClick={() => onAssetSheetOpen('tenue')}>
              <span className={s.accordionItemLabel}>Tenue</span>
              <span className={s.accordionItemStatus}>{teamAssetStatus === 'complete' ? '\u2713' : '\u2013'}</span>
              <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
            </button>
            <button type="button" className={s.accordionItem} onClick={() => onAssetSheetOpen('sponsor')}>
              <span className={s.accordionItemLabel}>Sponsor</span>
              <span className={s.accordionItemStatus}>{hasSponsor ? '\u2713' : '\u2013'}</span>
              <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
            </button>
            <button type="button" className={s.accordionItem} onClick={() => onAssetSheetOpen('member-photos')}>
              <span className={s.accordionItemLabel}>Ledenfoto's</span>
              <span className={s.accordionItemStatus}>{memberAssetSummary.complete}/{memberAssetSummary.total}</span>
              <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
            </button>
          </div>
        </div>
      </div>

      {/* Club assets — accordion (admin only) */}
      {isAdmin && (
        <div className={s.accordionSection}>
          <button
            type="button"
            className={s.accordionHeader}
            onClick={() => toggleSection('club-assets')}
            aria-expanded={expandedSections.has('club-assets')}
            aria-label="Club assets"
          >
            <AppIcon icon={Building2} size={18} className={s.accordionIcon} />
            <span className={s.accordionLabel}>Club assets</span>
            <AppIcon
              icon={ChevronDown}
              size={16}
              className={`${s.accordionChevron} ${expandedSections.has('club-assets') ? s.accordionChevronOpen : ''}`}
            />
          </button>
          <div className={`${s.accordionBody} ${expandedSections.has('club-assets') ? s.accordionBodyOpen : ''}`}>
            <div className={s.accordionBodyInner}>
              <button type="button" className={s.accordionItem} onClick={() => onAssetSheetOpen('logo')}>
                <span className={s.accordionItemLabel}>Logo</span>
                <span className={s.accordionItemStatus}>{Boolean((club as Record<string, unknown> | null)?.logo_url || (club as Record<string, unknown> | null)?.crest_url) ? '\u2713' : '\u2013'}</span>
                <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
              </button>
              <button type="button" className={s.accordionItem} onClick={() => onAssetSheetOpen('club-sponsor')}>
                <span className={s.accordionItemLabel}>Sponsor</span>
                <span className={s.accordionItemStatus}>{hasSponsor ? '\u2713' : '\u2013'}</span>
                <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
              </button>
              <button type="button" className={s.accordionItem} onClick={() => onAssetSheetOpen('kits')}>
                <span className={s.accordionItemLabel}>Kits</span>
                <span className={s.accordionItemStatus}>{hasAnyKit ? '\u2713' : '\u2013'}</span>
                <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beheer — admin only, quick links */}
      {isAdmin && (
        <>
          <div className={s.sectionLabel}>Beheer</div>
          <div className={s.accordionSection}>
            <button
              type="button"
              className={s.accordionHeader}
              onClick={() => toggleSection('beheer')}
              aria-expanded={expandedSections.has('beheer')}
            >
              <AppIcon icon={Settings} size={18} className={s.accordionIcon} />
              <span className={s.accordionLabel}>Beheer</span>
              <AppIcon
                icon={ChevronDown}
                size={16}
                className={`${s.accordionChevron} ${expandedSections.has('beheer') ? s.accordionChevronOpen : ''}`}
              />
            </button>
            <div className={`${s.accordionBody} ${expandedSections.has('beheer') ? s.accordionBodyOpen : ''}`}>
              <div className={s.accordionBodyInner}>
                <button type="button" className={s.accordionItem} onClick={() => onCreditsSheetOpen()}>
                  <AppIcon icon={Wallet} size={14} className={s.accordionItemIcon} />
                  <span className={s.accordionItemLabel}>Credits & saldo</span>
                  {creditsLabel && (
                    <span className={s.accordionItemStatus}>
                      {creditsLabel}
                    </span>
                  )}
                  <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                </button>
                <button type="button" className={s.accordionItem} onClick={() => onNavigateToTab('wedstrijden')}>
                  <AppIcon icon={Trophy} size={14} className={s.accordionItemIcon} />
                  <span className={s.accordionItemLabel}>Competities</span>
                  <span className={s.accordionItemStatus}>{competitionsCount}</span>
                  <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                </button>
                <button type="button" className={s.accordionItem} onClick={() => onAssetSheetOpen('member-photos')}>
                  <AppIcon icon={Upload} size={14} className={s.accordionItemIcon} />
                  <span className={s.accordionItemLabel}>Ledenfoto's</span>
                  <span className={s.accordionItemStatus}>{memberAssetSummary.complete}/{memberAssetSummary.total}</span>
                  <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
