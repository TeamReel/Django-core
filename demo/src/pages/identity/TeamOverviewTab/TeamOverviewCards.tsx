/**
 * TeamOverviewCards - Section card components for TeamOverviewTab
 */
import React, { useState, useMemo } from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { Input } from '@django-core/design-system';
import SlotIcon from '@/components/SlotIcon';
import { DisclosureSection } from '@/components/ui';
import { handleKeyboardClick } from '@/utils/a11y';
import { MEDIA_SLOTS, type MediaSlotId } from '@/constants/mediaSlots';
import { getMediaUrl, getMediaProcessingState, countFilledMediaSlots } from '@/utils/mediaHelpers';
import type {
  AssetStat,
  BrandAssetItem,
  MatchRecord,
  OverviewMember,
  Project,
  Organisation,
} from './types';
import { getInitials, getLabel, fmtDate, fmtTime, matchDisplayTitle } from './types';
import ov from '../TeamOverviewTab.module.css';

// ── Hero Card ──
interface HeroCardProps {
  team: Project;
  club: Project;
  org: Organisation;
  membersCount: number | null;
  membersLoading: boolean;
  seasonsCount: number;
  seasonsLoading: boolean;
  contentCount: number | null;
  contentLoading: boolean;
  overallAssetPct: number;
  assetsLoading: boolean;
}

export function HeroCard({
  team,
  club,
  org,
  membersCount,
  membersLoading,
  seasonsCount,
  seasonsLoading,
  contentCount,
  contentLoading,
  overallAssetPct,
  assetsLoading,
}: HeroCardProps) {
  return (
    <div className={ov.heroCard}>
      <div className={ov.heroTitle}>{team?.name || 'Team'}</div>
      <div className={ov.heroSubtitle}>
        {club?.name || 'Club'} &middot; {org?.name || 'Federatie'}
      </div>
      <div className={ov.heroStats}>
        <div className={ov.heroStat}>
          <span className={ov.heroStatValue}>{membersLoading ? '…' : membersCount ?? '—'}</span>
          <span className={ov.heroStatLabel}>Leden</span>
        </div>
        <div className={ov.heroStat}>
          <span className={ov.heroStatValue}>{seasonsLoading ? '…' : seasonsCount}</span>
          <span className={ov.heroStatLabel}>Seizoenen</span>
        </div>
        <div className={ov.heroStat}>
          <span className={ov.heroStatValue}>{contentLoading ? '…' : contentCount ?? 0}</span>
          <span className={ov.heroStatLabel}>Content</span>
        </div>
        <div className={ov.heroStat}>
          <span className={ov.heroStatValue}>{assetsLoading ? '…' : `${overallAssetPct}%`}</span>
          <span className={ov.heroStatLabel}>Assets</span>
        </div>
      </div>
    </div>
  );
}

// ── Brand Assets Card ──
interface BrandAssetsCardProps {
  brandAssets: BrandAssetItem[];
  onNavigate: () => void;
}

export function BrandAssetsCard({ brandAssets, onNavigate }: BrandAssetsCardProps) {
  if (brandAssets.length === 0) return null;

  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Club assets</h3>
        <button className={ov.sectionLink} onClick={onNavigate}>Beheer →</button>
      </div>
      <div className={ov.brandGrid}>
        {brandAssets.map((a) => (
          <div key={a.label} className={ov.brandItem} data-present={a.present ? 'true' : 'false'}>
            <span className={`${ov.brandIcon} ${a.present ? 'status-success' : 'status-muted'}`}>
              {a.present ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </span>
            <span className={ov.brandLabel}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Media Assets Card (expandable per-player) ──

/** State labels for media slots */
const MEDIA_STATE_LABEL: Record<string, string> = {
  processed: 'Klaar',
  raw: 'Uploaded',
  processing: 'Bezig…',
  empty: '—',
};

function getMemberPhoto(m: Record<string, unknown>): string | null {
  for (const sid of ['closeup', 'kit', 'profile'] as MediaSlotId[]) {
    const url = getMediaUrl(m, sid);
    if (url) return url;
  }
  return (m?.user as Record<string, unknown>)?.avatar_url as string | null;
}

function getMemberName(m: Record<string, unknown>): string {
  const u = (m?.user as Record<string, unknown>) || m;
  return (
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Lid'
  );
}

function getMemberInitials(m: Record<string, unknown>): string {
  const u = (m?.user as Record<string, unknown>) || m;
  const f = String(u?.first_name || '').trim();
  const l = String(u?.last_name || '').trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  const email = String(u?.email || '').trim();
  if (email) return email[0].toUpperCase();
  return '?';
}

interface MediaAssetsCardProps {
  assetStats: AssetStat[];
  loading: boolean;
  fullMembers: Array<Record<string, unknown>>;
  fullMembersLoading: boolean;
}

export function MediaAssetsCard({ assetStats, loading, fullMembers, fullMembersLoading }: MediaAssetsCardProps) {
  const [showPlayers, setShowPlayers] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');

  const totalSlots = MEDIA_SLOTS.length;

  const filteredPlayers = useMemo(() => {
    if (!showPlayers) return [];
    const q = playerSearch.trim().toLowerCase();
    if (!q) return fullMembers;
    return fullMembers.filter((m) => getMemberName(m).toLowerCase().includes(q));
  }, [showPlayers, fullMembers, playerSearch]);

  if (assetStats.length === 0 || assetStats[0].total === 0) return null;

  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Media assets</h3>
      </div>
      {loading ? (
        <div className={ov.loadingText}>Laden…</div>
      ) : (
        <>
          <div className={ov.assetList}>
            {assetStats.map((slot) => (
              <div key={slot.id} className={ov.assetRow}>
                <div className={ov.assetInfo}>
                  <span className={ov.assetIcon}><SlotIcon name={slot.icon || ''} size={14} /></span>
                  <span className={ov.assetLabel}>{slot.label}</span>
                </div>
                <div className={ov.assetRight}>
                  <span className={ov.assetCount}>{slot.done}/{slot.total}</span>
                </div>
                <div className={ov.progressTrack}>
                  <div
                    className={ov.progressFill}
                    style={{ width: `${slot.pct}%` }}
                    data-complete={slot.pct === 100 ? 'true' : 'false'}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Expandable per-player section */}
          <DisclosureSection
            title="Per speler"
            badge={`${fullMembers.length} leden`}
            open={showPlayers}
            onToggle={setShowPlayers}
          >
            <div className={ov.playerSection}>
              {fullMembersLoading && fullMembers.length === 0 ? (
                <div className={ov.loadingText}>Laden…</div>
              ) : (
                <>
                  <div className={ov.playerSearchRow}>
                    <Input
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Zoek speler…"
                    />
                  </div>
                  {filteredPlayers.map((m) => {
                    const mid = String(m?.id || (m?.user as Record<string, unknown>)?.id || '');
                    const name = getMemberName(m);
                    const photo = getMemberPhoto(m);
                    const filled = countFilledMediaSlots(m);
                    const pct = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;

                    return (
                      <div key={mid} className={ov.playerCard}>
                        <div className={ov.playerHeader}>
                          <div className={ov.playerAvatar}>
                            {photo ? (
                              <img
                                src={photo}
                                alt={name}
                                className={ov.playerAvatarImg}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <span className={ov.playerInitials}>{getMemberInitials(m)}</span>
                            )}
                          </div>
                          <div className={ov.playerMeta}>
                            <span className={ov.playerName}>{name}</span>
                            <span className={ov.playerScore}>{filled}/{totalSlots} slots · {pct}%</span>
                          </div>
                        </div>
                        <div className={ov.playerSlots}>
                          {MEDIA_SLOTS.map((slot) => {
                            const state = getMediaProcessingState(m, slot.id);
                            return (
                              <div key={slot.id} className={ov.playerSlotRow}>
                                <span className={ov.playerSlotIcon}><SlotIcon name={slot.icon} size={14} /></span>
                                <span className={ov.playerSlotLabel}>{slot.label}</span>
                                <span className={ov.playerSlotStatus} data-state={state}>
                                  {MEDIA_STATE_LABEL[state] || state}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </DisclosureSection>
        </>
      )}
    </div>
  );
}

// ── Seasons Card (expandable hierarchy) ──
interface SeasonsCardProps {
  seasons: Array<{ id?: string | number; slug?: string; name?: string }>;
  competitionsBySeasonId: Record<string, Record<string, unknown>[]>;
  matchesCountBySeasonId: Record<string, number>;
  matchesCountByCompetitionId: Record<string, number>;
  teamMatchesByPeriodId: Record<string, MatchRecord[]>;
  teamMatchesLoading: boolean;
  loading: boolean;
  routeKeys: { orgKey: string; clubKey: string; teamKey: string };
  onSeasonClick: (path: string) => void;
  onMatchClick?: (match: MatchRecord) => void;
}

export function SeasonsCard({
  seasons,
  competitionsBySeasonId,
  matchesCountBySeasonId,
  matchesCountByCompetitionId,
  teamMatchesByPeriodId,
  teamMatchesLoading,
  loading,
  routeKeys,
  onSeasonClick,
  onMatchClick,
}: SeasonsCardProps) {
  const { orgKey, clubKey, teamKey } = routeKeys;

  // Unique id prefix for comp aria-controls
  const compIdPrefix = React.useId();
  // Expand/collapse per-competition
  const [expandedComps, setExpandedComps] = useState<Set<string>>(new Set());
  const toggleComp = (id: string) =>
    setExpandedComps((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Seizoenen</h3>
      </div>
      {loading && seasons.length === 0 ? (
        <div className={ov.loadingText}>Laden…</div>
      ) : seasons.length === 0 ? (
        <div className={ov.emptyText}>Geen seizoenen gevonden.</div>
      ) : (
        seasons.map((season) => {
          const sid = String(season?.id ?? '').trim();
          const seasonKey = String(season?.slug || sid).trim();
          const matchCount = matchesCountBySeasonId[sid] || 0;
          const compCount = (competitionsBySeasonId[sid] || []).length;
          const seasonPath =
            orgKey && clubKey && teamKey && seasonKey
              ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(clubKey)}/${encodeURIComponent(teamKey)}/${encodeURIComponent(seasonKey)}`
              : '';
          const competitions = competitionsBySeasonId[sid] || [];

          return (
            <DisclosureSection
              key={sid}
              title={String(season?.name || 'Seizoen')}
              badge={`${compCount} comp · ${matchCount} wed.`}
            >
              <div className={ov.seasonDrillDown}>
                {seasonPath && (
                  <button
                    type="button"
                    className={ov.drillDownLink}
                    onClick={() => onSeasonClick(seasonPath)}
                  >
                    Bekijk seizoen →
                  </button>
                )}

                {competitions.length === 0 ? (
                  <div className={ov.emptyText}>Geen competities.</div>
                ) : (
                  competitions.map((comp) => {
                    const cid = String(comp?.id ?? '').trim();
                    const compKey = String(comp?.slug || cid).trim();
                    const compPath =
                      seasonPath && compKey
                        ? `${seasonPath}/${encodeURIComponent(compKey)}`
                        : '';
                    const compMatchCount = matchesCountByCompetitionId[cid] ?? (comp?.activities_count as number) ?? 0;
                    const isCompOpen = expandedComps.has(cid);
                    const compMatches = (teamMatchesByPeriodId[cid] || []) as MatchRecord[];

                    return (
                      <div key={cid} className={ov.compCard}>
                        <button
                          type="button"
                          className={ov.compHeader}
                          onClick={() => toggleComp(cid)}
                          aria-expanded={isCompOpen}
                          aria-controls={`comp-body-${compIdPrefix}-${cid}`}
                        >
                          <span className={ov.compName}>{String(comp?.name || 'Competitie')}</span>
                          <span className={ov.compRight}>
                            <span className={ov.compPill}>{compMatchCount} wed.</span>
                            <span className={`${ov.compChevron}${isCompOpen ? ` ${ov.compChevronOpen}` : ''}`}>
                              <ChevronRight size={14} />
                            </span>
                          </span>
                        </button>

                        {isCompOpen && (
                          <div id={`comp-body-${compIdPrefix}-${cid}`} className={ov.compBody}>
                            {compPath && (
                              <button
                                type="button"
                                className={ov.drillDownLink}
                                onClick={() => onSeasonClick(compPath)}
                              >
                                Bekijk competitie →
                              </button>
                            )}
                            {teamMatchesLoading && compMatches.length === 0 ? (
                              <div className={ov.loadingText}>Laden…</div>
                            ) : compMatches.length === 0 ? (
                              <div className={ov.emptyText}>Geen wedstrijden.</div>
                            ) : (
                              <div className={ov.matchList}>
                                {compMatches.map((m) => (
                                  <button
                                    key={String(m.id)}
                                    type="button"
                                    className={ov.matchRow}
                                    onClick={() => onMatchClick?.(m)}
                                  >
                                    <div className={ov.matchDate}>
                                      <span className={ov.matchDay}>{fmtDate(m)}</span>
                                      <span className={ov.matchTime}>{fmtTime(m)}</span>
                                    </div>
                                    <span className={ov.matchTitle}>{matchDisplayTitle(m)}</span>
                                    <span className={ov.matchArrow}>›</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </DisclosureSection>
          );
        })
      )}
    </div>
  );
}

// ── Matches Card ──
interface MatchesCardProps {
  title: string;
  matches: MatchRecord[];
  loading: boolean;
  showLink?: boolean;
  onNavigate?: () => void;
  onMatchClick?: (match: MatchRecord) => void;
}

export function MatchesCard({ title, matches, loading, showLink, onNavigate, onMatchClick }: MatchesCardProps) {
  if (matches.length === 0 && !loading) return null;

  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>{title}</h3>
        {showLink && onNavigate && (
          <button className={ov.sectionLink} onClick={onNavigate}>Alle wedstrijden →</button>
        )}
      </div>
      {loading ? (
        <div className={ov.loadingText}>Laden…</div>
      ) : (
        <div className={ov.matchList}>
          {matches.map((m) => (
            <button
              key={String(m.id)}
              type="button"
              className={ov.matchRow}
              onClick={() => onMatchClick?.(m)}
            >
              <div className={ov.matchDate}>
                <span className={ov.matchDay}>{fmtDate(m)}</span>
                <span className={ov.matchTime}>{fmtTime(m)}</span>
              </div>
              <span className={ov.matchTitle}>{matchDisplayTitle(m)}</span>
              <span className={ov.matchArrow}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Members Card ──
interface MembersCardProps {
  members: OverviewMember[];
  loading: boolean;
  onNavigate: () => void;
}

export function MembersCard({ members, loading, onNavigate }: MembersCardProps) {
  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Leden</h3>
        <button className={ov.sectionLink} onClick={onNavigate}>Alle leden →</button>
      </div>
      {loading && members.length === 0 ? (
        <div className={ov.loadingText}>Laden…</div>
      ) : members.length === 0 ? (
        <div className={ov.emptyText}>Geen leden gevonden.</div>
      ) : (
        <div className={ov.memberList}>
          {members.slice(0, 8).map((m) => (
            <div key={String(m.id)} className={ov.memberRow}>
              <div className={ov.memberAvatar}>{getInitials(m)}</div>
              <span className={ov.memberName}>{getLabel(m)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Team Details Card ──
interface TeamDetailsCardProps {
  team: Project;
  club: Project;
  org: Organisation;
  totalCompetitions: number;
  loading: boolean;
}

export function TeamDetailsCard({ team, club, org, totalCompetitions, loading }: TeamDetailsCardProps) {
  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Team details</h3>
      </div>
      <div className={ov.detailList}>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Naam</span>
          <span className={ov.detailValue}>{team?.name || '—'}</span>
        </div>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Club</span>
          <span className={ov.detailValue}>{club?.name || '—'}</span>
        </div>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Federatie</span>
          <span className={ov.detailValue}>{org?.name || '—'}</span>
        </div>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Competities</span>
          <span className={ov.detailValue}>{loading ? '…' : totalCompetitions}</span>
        </div>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Type</span>
          <span className={ov.detailValue}>
            {team?.team_type === 'legends' ? 'Legends' : 'Regulier'}
          </span>
        </div>
      </div>
    </div>
  );
}
