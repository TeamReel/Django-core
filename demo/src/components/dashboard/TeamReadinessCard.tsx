/**
 * TeamReadinessCard — Merged MemberContentProgressCard + AssetsOverviewCard.
 *
 * Card preview: combined progress bar (team + members) + headline stats.
 * Sheet: Tabs (design system) — "Spelers" (member progress) + "Assets" (brand + member assets).
 *
 * Queries reuse same TanStack keys → deduplication with other dashboard cards.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Package, Shield, Users, CheckCircle2, Circle,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabList, Tab, TabPanel } from '@django-core/design-system';
import { api } from '@/api';
import type { BrandAsset } from '@/types/api/branding';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
import { queryKeys } from '../../utils/queryKeys';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './TeamReadinessCard.module.css';

/* ── Constants ─────────────────────────────── */

const EXPECTED_TEAM_ASSETS = [
  { key: 'logo', label: 'Club Logo', matchTypes: ['logo', 'logo_upload'] },
  { key: 'kit_home', label: 'Thuistenue', matchTypes: ['kit_home', 'kit_home_upload', 'kit_home_combined'] },
  { key: 'kit_away', label: 'Uittenue', matchTypes: ['kit_away', 'kit_away_upload', 'kit_away_combined'] },
  { key: 'kit_goalkeeper', label: 'Keeperstenue', matchTypes: ['kit_goalkeeper', 'kit_goalkeeper_upload', 'kit_goalkeeper_combined'] },
  { key: 'sponsor', label: 'Sponsor Logo', matchTypes: ['sponsor_logo', 'sponsor_logo_upload'] },
  { key: 'background', label: 'Achtergrond', matchTypes: ['stadium_background', 'club_background', 'club_background_upload'] },
] as const;

const EXPECTED_MEMBER_TYPES = [
  { key: 'profile_photo', label: 'Foto' },
  { key: 'in_tenue', label: 'Tenue' },
  { key: 'closeup', label: 'Close-up' },
  { key: 'short_intro', label: 'Intro' },
] as const;

/* ── Types ─────────────────────────────────── */

interface TeamAssetStatus {
  key: string;
  label: string;
  present: boolean;
}

interface MemberProgress {
  id: string;
  name: string;
  avatarUrl?: string;
  completedTypes: Set<string>;
}

/* ── Component ─────────────────────────────── */

export const TeamReadinessCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation;
  const project = context.project;

  const [sheetOpen, setSheetOpen] = useState(false);

  // ── Three parallel queries (no waterfall) ──

  const { data: brandData, isLoading: brandLoading } = useQuery({
    queryKey: queryKeys.branding.assets(org?.slug || org?.id?.toString()),
    queryFn: () => api.list<BrandAsset>('/branding/assets/', {
      params: { organisation_scope: org!.slug || org!.id },
    }),
    enabled: !!org,
    staleTime: 15 * 60 * 1000,
  });

  const { data: membersData, isLoading: membersLoading } = useProjectMembers(
    org?.slug,
    project?.slug,
  );

  const genFilters = useMemo(() => {
    if (!project) return undefined;
    return { status: 'completed', project: project.id } as Record<string, string>;
  }, [project?.id]);

  const { data: genData, isLoading: genLoading } = useGenerativeRequests(genFilters);

  const loading = brandLoading || membersLoading || genLoading;

  // ── Team asset statuses ──

  const teamAssets = useMemo<TeamAssetStatus[]>(() => {
    const brandItems = brandData?.results ?? [];
    const activeTypes = new Set(
      brandItems.filter((a) => a.is_active !== false).map((a) => a.asset_type),
    );
    return EXPECTED_TEAM_ASSETS.map(ea => ({
      key: ea.key,
      label: ea.label,
      present: ea.matchTypes.some(t => activeTypes.has(t)),
    }));
  }, [brandData]);

  // ── Member progress via client-side join ──

  const memberProgress = useMemo<MemberProgress[]>(() => {
    const memberList = membersData?.results ?? [];
    const genItems = genData?.results ?? [];
    if (memberList.length === 0) return [];

    const memberContentMap = new Map<string, Set<string>>();
    for (const req of genItems as any[]) {
      const tplType = req.template?.template_type || '';
      if (tplType !== 'member') continue;
      const subtype = req.template?.template_subtype || req.input_data?.template_subtype || '';
      const memberIds: string[] = req.input_data?.member_ids || [];
      const singleMemberId = req.input_data?.member_id;
      const allIds = singleMemberId ? [singleMemberId, ...memberIds] : memberIds;

      for (const mid of allIds) {
        if (!memberContentMap.has(String(mid))) {
          memberContentMap.set(String(mid), new Set());
        }
        if (subtype) memberContentMap.get(String(mid))!.add(subtype);
      }
    }

    return memberList
      .slice(0, 20)
      .map((m: any) => {
        const userId = String(m.user?.id || m.id);
        const memberId = String(m.id);
        const completedSet = memberContentMap.get(userId) || memberContentMap.get(memberId) || new Set<string>();
        const name = m.user?.first_name
          ? `${m.user.first_name} ${m.user.last_name || ''}`.trim()
          : m.user_name || m.name || 'Onbekend';
        return { id: memberId, name, avatarUrl: m.user?.avatar_url || m.avatar_url, completedTypes: completedSet };
      })
      .sort((a, b) => a.completedTypes.size - b.completedTypes.size);
  }, [membersData, genData]);

  // ── Derived stats ──

  const teamPresent = teamAssets.filter(a => a.present).length;
  const teamTotal = teamAssets.length;
  const teamPercent = teamTotal > 0 ? Math.round((teamPresent / teamTotal) * 100) : 0;
  const teamMissing = teamTotal - teamPresent;

  const memberExpected = EXPECTED_MEMBER_TYPES.length;
  const memberComplete = memberProgress.filter(m => m.completedTypes.size >= memberExpected).length;
  const memberPercent = memberProgress.length > 0
    ? Math.round(
        (memberProgress.reduce((s, m) => s + Math.min(m.completedTypes.size, memberExpected), 0)
          / (memberProgress.length * memberExpected)) * 100,
      )
    : 0;

  const overallPercent = Math.round((teamPercent + memberPercent) / 2);

  const progressClass = (pct: number) =>
    pct >= 80 ? styles.progressFillGood : pct >= 40 ? styles.progressFillWarn : styles.progressFillBad;

  if (!project) return null;
  if (!loading && teamAssets.length === 0 && memberProgress.length === 0) return null;

  /* ── Render helpers ──────────────────────── */

  const renderMemberRowDots = (member: MemberProgress) => {
    const completed = Math.min(member.completedTypes.size, memberExpected);
    const isComplete = completed >= memberExpected;
    return (
      <div key={member.id} className={styles.memberRow}>
        <div className={styles.memberAvatar}>
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt="" className={styles.avatarImg} loading="lazy" />
          ) : (
            <span className={styles.avatarInitial}>{member.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className={styles.memberInfo}>
          <span className={styles.memberName}>{member.name}</span>
          <div className={styles.typeDots}>
            {EXPECTED_MEMBER_TYPES.map(t => (
              <span
                key={t.key}
                className={styles.typeDot}
                data-ok={member.completedTypes.has(t.key)}
                title={`${t.label}: ${member.completedTypes.has(t.key) ? '✓' : '✗'}`}
              />
            ))}
          </div>
        </div>
        <span className={`${styles.memberMeta} ${isComplete ? styles.memberMetaComplete : ''}`}>
          {isComplete ? <CheckCircle2 size={13} /> : `${completed}/${memberExpected}`}
        </span>
      </div>
    );
  };

  const renderMemberRowBar = (member: MemberProgress) => {
    const completed = Math.min(member.completedTypes.size, memberExpected);
    const pct = Math.round((completed / memberExpected) * 100);
    const isComplete = pct >= 100;
    return (
      <div key={member.id} className={styles.memberRow}>
        <div className={styles.memberAvatar}>
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt="" className={styles.avatarImg} loading="lazy" />
          ) : (
            <span className={styles.avatarInitial}>{member.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className={styles.memberInfo}>
          <span className={styles.memberName}>{member.name}</span>
          <div className={styles.memberProgressTrack}>
            <div
              className={`${styles.memberProgressFill} ${isComplete ? styles.memberProgressComplete : ''}`}
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
        </div>
        <span className={`${styles.memberMeta} ${isComplete ? styles.memberMetaComplete : ''}`}>
          {isComplete ? <CheckCircle2 size={13} /> : `${pct}%`}
        </span>
      </div>
    );
  };

  const renderTeamAssets = () => (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>
        <Shield size={12} />
        Team Assets
      </div>

      <div className={styles.assetGrid}>
        {teamAssets.map(asset => (
          <div key={asset.key} className={styles.assetItem} data-present={asset.present}>
            <span className={styles.assetCheck} data-ok={asset.present}>
              {asset.present ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </span>
            <span className={styles.assetLabel}>{asset.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.summaryBar}>
        <div className={styles.summaryLabel}>
          <span className={styles.summaryText}>{teamPresent} van {teamTotal} aanwezig</span>
          <span className={styles.summaryPercent}>{teamPercent}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${progressClass(teamPercent)}`}
            style={{ width: `${Math.max(4, teamPercent)}%` }}
          />
        </div>
      </div>

      {teamMissing > 0 && (
        <div
          className={styles.missingCallout}
          onClick={(e) => {
            e.stopPropagation();
            setSheetOpen(false);
            navigate(project ? `/teams/${project.slug || project.id}/identity` : '/identity');
          }}
        >
          <span className={styles.missingIcon}><AlertTriangle size={14} /></span>
          <span className={styles.missingText}>
            {teamMissing} asset{teamMissing > 1 ? 's' : ''} ontbre{teamMissing > 1 ? 'ken' : 'ekt'}
          </span>
          <span className={styles.missingArrow}><ChevronRight size={14} /></span>
        </div>
      )}
    </div>
  );

  /* ── Render ──────────────────────────────── */

  return (
    <>
      <div
        className={styles.card}
        onClick={() => !loading && setSheetOpen(true)}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Package size={16} />
          </div>
          <span className={styles.title}>Team gereedheid</span>
          {!loading && (
            <span className={styles.totalBadge}>{overallPercent}%</span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div>
            <div className={`${styles.shimmer} ${styles.shimmerWide}`} />
            <div className={`${styles.shimmer} ${styles.shimmerHalf}`} />
            <div className={`${styles.shimmer} ${styles.shimmerNarrow}`} />
          </div>
        )}

        {/* ── Preview: combined progress + top members ─── */}
        {!loading && (
          <>
            {/* Team assets progress */}
            {teamAssets.length > 0 && (
              <div className={styles.summaryBar}>
                <div className={styles.summaryLabel}>
                  <span className={styles.summaryText}>
                    <Shield size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                    Assets: {teamPresent}/{teamTotal}
                  </span>
                  <span className={styles.summaryPercent}>{teamPercent}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={`${styles.progressFill} ${progressClass(teamPercent)}`}
                    style={{ width: `${Math.max(4, teamPercent)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Member progress */}
            {memberProgress.length > 0 && (
              <div className={styles.memberTeamBar}>
                <div className={styles.summaryLabel}>
                  <span className={styles.summaryText}>
                    <Users size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                    Spelers: {memberComplete}/{memberProgress.length} volledig
                  </span>
                  <span className={styles.summaryPercent}>{memberPercent}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={`${styles.progressFill} ${progressClass(memberPercent)}`}
                    style={{ width: `${Math.max(4, memberPercent)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Top 4 members (compact preview) */}
            {memberProgress.length > 0 && (
              <div className={styles.memberList}>
                {memberProgress.slice(0, 4).map(renderMemberRowBar)}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sheet with Tabs ──────────────────── */}
      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Team gereedheid"
        icon={<Package size={18} />}
      >
        <Tabs defaultValue="players">
          <TabList>
            <Tab value="players">Spelers</Tab>
            <Tab value="assets">Assets</Tab>
          </TabList>

          {/* ── Tab: Spelers ──────────────────── */}
          <TabPanel value="players">
            <div className={styles.tabContent}>
              {/* Team-wide member progress */}
              {memberProgress.length > 0 && (
                <>
                  <div className={styles.summaryBar}>
                    <div className={styles.summaryLabel}>
                      <span className={styles.summaryText}>
                        {memberComplete}/{memberProgress.length} spelers volledig
                      </span>
                      <span className={styles.summaryPercent}>{memberPercent}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={`${styles.progressFill} ${progressClass(memberPercent)}`}
                        style={{ width: `${Math.max(4, memberPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Full member list with progress bars */}
                  <div className={styles.memberList} style={{ marginTop: 'var(--space-4)' }}>
                    {memberProgress.map(renderMemberRowBar)}
                  </div>

                  {memberComplete < memberProgress.length && (
                    <div
                      className={styles.missingCallout}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSheetOpen(false);
                        navigate(project ? `/teams/${project.slug || project.id}/squad` : '/squad');
                      }}
                    >
                      <span className={styles.missingIcon}><AlertTriangle size={14} /></span>
                      <span className={styles.missingText}>
                        {memberProgress.length - memberComplete} speler{memberProgress.length - memberComplete > 1 ? 's' : ''} onvolledig
                      </span>
                      <span className={styles.missingArrow}><ChevronRight size={14} /></span>
                    </div>
                  )}
                </>
              )}

              <button
                className={styles.navLink}
                onClick={() => {
                  setSheetOpen(false);
                  navigate(project ? `/teams/${project.slug || project.id}/squad` : '/squad');
                }}
              >
                Ga naar squad <ChevronRight size={14} />
              </button>
            </div>
          </TabPanel>

          {/* ── Tab: Assets ───────────────────── */}
          <TabPanel value="assets">
            <div className={styles.tabContent}>
              {/* Team brand assets */}
              {renderTeamAssets()}

              {/* Member assets with dots */}
              {memberProgress.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>
                    <Users size={12} />
                    Speler Assets
                  </div>

                  <div className={styles.summaryBar}>
                    <div className={styles.summaryLabel}>
                      <span className={styles.summaryText}>
                        {memberComplete}/{memberProgress.length} spelers volledig
                      </span>
                      <span className={styles.summaryPercent}>{memberPercent}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={`${styles.progressFill} ${progressClass(memberPercent)}`}
                        style={{ width: `${Math.max(4, memberPercent)}%` }}
                      />
                    </div>
                  </div>

                  <div className={styles.memberList} style={{ marginTop: 'var(--space-3)' }}>
                    {memberProgress.map(renderMemberRowDots)}
                  </div>
                </div>
              )}

              <button
                className={styles.navLink}
                onClick={() => {
                  setSheetOpen(false);
                  navigate(project ? `/teams/${project.slug || project.id}/identity` : '/identity');
                }}
              >
                Ga naar identity <ChevronRight size={14} />
              </button>
            </div>
          </TabPanel>
        </Tabs>
      </NavigationSheet>
    </>
  );
};
