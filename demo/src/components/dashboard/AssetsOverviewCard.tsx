/**
 * AssetsOverviewCard — Brand asset & member asset inventory.
 *
 * Two sections:
 * 1. Team assets: brand-level (logo, kits, backgrounds) — checklist with progress
 * 2. Member assets: per-member content coverage (profile photo, in-tenue, etc.)
 *
 * Shows what's present and what's missing, with progress bars and action hints.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Package, Shirt, ImageIcon, Shield, CheckCircle2, Circle,
  ChevronRight, AlertTriangle, Users,
} from 'lucide-react';
import { api } from '@/api';
import type { BrandAsset } from '@/types/api/branding';
import type { GenerationRequest } from '@/types/api/generative';
import styles from './AssetsOverviewCard.module.css';

/* ── Helpers ────────────────────────────────────────────── */


/* ── Brand asset type definitions ──────────────────────── */

interface ExpectedAsset {
  key: string;
  label: string;
  /** Match against asset_type values from API */
  matchTypes: string[];
}

/** Team-level brand assets we expect to be present */
const EXPECTED_TEAM_ASSETS: ExpectedAsset[] = [
  { key: 'logo', label: 'Club Logo', matchTypes: ['logo', 'logo_upload'] },
  { key: 'kit_home', label: 'Thuistenue', matchTypes: ['kit_home', 'kit_home_upload', 'kit_home_combined'] },
  { key: 'kit_away', label: 'Uittenue', matchTypes: ['kit_away', 'kit_away_upload', 'kit_away_combined'] },
  { key: 'kit_goalkeeper', label: 'Keeperstenue', matchTypes: ['kit_goalkeeper', 'kit_goalkeeper_upload', 'kit_goalkeeper_combined'] },
  { key: 'sponsor', label: 'Sponsor Logo', matchTypes: ['sponsor_logo', 'sponsor_logo_upload'] },
  { key: 'background', label: 'Achtergrond', matchTypes: ['stadium_background', 'club_background', 'club_background_upload'] },
];

/** Member-level content types we track for completeness */
const EXPECTED_MEMBER_TYPES = [
  { key: 'profile_photo', label: 'Foto' },
  { key: 'in_tenue', label: 'Tenue' },
  { key: 'closeup', label: 'Close-up' },
  { key: 'short_intro', label: 'Intro' },
] as const;

/* ── Types ──────────────────────────────────────────────── */

interface TeamAssetStatus {
  key: string;
  label: string;
  present: boolean;
}

interface MemberAssetProgress {
  id: string;
  name: string;
  avatarUrl?: string;
  completedTypes: Set<string>;
}

/* ── Component ─────────────────────────────────────────── */

export const AssetsOverviewCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation;
  const project = context.project;

  const [teamAssets, setTeamAssets] = useState<TeamAssetStatus[]>([]);
  const [memberProgress, setMemberProgress] = useState<MemberAssetProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // ── 1. Fetch brand assets ──
        const { results: brandItems } = await api.list<BrandAsset>('/branding/assets/', {
          params: { organisation_scope: org.slug || org.id },
        }).catch(() => ({ results: [] as unknown[], count: 0, next: null, previous: null }));

        // Determine which are present (only active assets)
        const activeTypes = new Set(
          brandItems
            .filter((a) => a.is_active !== false)
            .map((a) => a.asset_type),
        );

        const assetStatuses: TeamAssetStatus[] = EXPECTED_TEAM_ASSETS.map(ea => ({
          key: ea.key,
          label: ea.label,
          present: ea.matchTypes.some(t => activeTypes.has(t)),
        }));

        if (!cancelled) setTeamAssets(assetStatuses);

        // ── 2. Fetch member content coverage ──
        if (project) {
          const { results: memberList } = await api.list<Record<string, unknown>>(
            `/organisations/${org.slug}/projects/${project.slug}/members/`,
            { pageSize: 50 },
          ).catch(() => ({ results: [] as unknown[], count: 0, next: null, previous: null }));

          if (memberList.length > 0) {
            // Fetch completed generation requests
            const { results: genItems } = await api.list<GenerationRequest>('/generative/requests/', {
              params: { status: 'completed', project: project.id },
              pageSize: 500,
            }).catch(() => ({ results: [] as unknown[], count: 0, next: null, previous: null }));

            // Build member → completed subtypes map
            const memberContentMap = new Map<string, Set<string>>();
            for (const req of genItems) {
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

            const progress: MemberAssetProgress[] = memberList
              .slice(0, 20)
              .map((m) => {
                const userId = String(m.user?.id || m.id);
                const memberId = String(m.id);
                const completedSet = memberContentMap.get(userId) || memberContentMap.get(memberId) || new Set<string>();
                const name = m.user?.first_name
                  ? `${m.user.first_name} ${m.user.last_name || ''}`.trim()
                  : m.user_name || m.name || 'Onbekend';
                return { id: memberId, name, avatarUrl: m.user?.avatar_url || m.avatar_url, completedTypes: completedSet };
              })
              .sort((a: MemberAssetProgress, b: MemberAssetProgress) => a.completedTypes.size - b.completedTypes.size);

            if (!cancelled) setMemberProgress(progress);
          }
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [org?.slug, org?.id, project?.slug, project?.id]);

  // Derived stats
  const teamPresent = teamAssets.filter(a => a.present).length;
  const teamTotal = teamAssets.length;
  const teamPercent = teamTotal > 0 ? Math.round((teamPresent / teamTotal) * 100) : 0;
  const teamMissing = teamTotal - teamPresent;

  const memberTotal = memberProgress.length;
  const memberExpected = EXPECTED_MEMBER_TYPES.length;
  const memberComplete = memberProgress.filter(m => m.completedTypes.size >= memberExpected).length;
  const memberPercent = memberTotal > 0
    ? Math.round(
      (memberProgress.reduce((s, m) => s + Math.min(m.completedTypes.size, memberExpected), 0)
      / (memberTotal * memberExpected)) * 100)
    : 0;

  const progressClass = (pct: number) =>
    pct >= 80 ? styles.progressFillGood : pct >= 40 ? styles.progressFillWarn : styles.progressFillBad;

  if (!loading && teamAssets.length === 0 && memberProgress.length === 0) return null;

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Package size={16} />
        </div>
        <span className={styles.title}>Asset inventaris</span>
        {teamTotal > 0 && (
          <span className={styles.totalBadge}>{teamPresent}/{teamTotal}</span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div>
          <div className={`${styles.shimmer} ${styles.shimmerHalf}`} />
          <div className={`${styles.shimmer} ${styles.shimmerWide}`} />
          <div className={`${styles.shimmer} ${styles.shimmerNarrow}`} />
        </div>
      )}

      {/* ── Team Brand Assets ──────────────────── */}
      {!loading && teamAssets.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            <Shield size={12} />
            Team Assets
          </div>

          <div className={styles.assetGrid}>
            {teamAssets.map(asset => (
              <div
                key={asset.key}
                className={styles.assetItem}
                data-present={asset.present}
              >
                <span className={styles.assetCheck} data-ok={asset.present}>
                  {asset.present ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                </span>
                <span className={styles.assetLabel}>{asset.label}</span>
              </div>
            ))}
          </div>

          {/* Team progress bar */}
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

          {/* Missing callout */}
          {teamMissing > 0 && (
            <div
              className={styles.missingCallout}
              onClick={() => navigate(project ? `/teams/${project.slug || project.id}/identity` : '/identity')}
            >
              <span className={styles.missingIcon}><AlertTriangle size={14} /></span>
              <span className={styles.missingText}>
                {teamMissing} asset{teamMissing > 1 ? 's' : ''} ontbre{teamMissing > 1 ? 'ken' : 'ekt'}
              </span>
              <span className={styles.missingArrow}><ChevronRight size={14} /></span>
            </div>
          )}
        </div>
      )}

      {/* ── Member Assets ──────────────────────── */}
      {!loading && memberProgress.length > 0 && (
        <div className={styles.memberSection}>
          <div className={styles.sectionLabel}>
            <Users size={12} />
            Speler Assets
          </div>

          {/* Team-wide member progress */}
          <div className={styles.memberTeamBar}>
            <div className={styles.summaryLabel}>
              <span className={styles.summaryText}>
                {memberComplete}/{memberTotal} spelers volledig
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

          {/* Individual members */}
          <div className={styles.memberList}>
            {memberProgress.slice(0, 8).map(member => {
              const completed = Math.min(member.completedTypes.size, memberExpected);
              const pct = Math.round((completed / memberExpected) * 100);
              const isComplete = pct >= 100;

              return (
                <div key={member.id} className={styles.memberRow}>
                  <div className={styles.memberAvatar}>
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className={styles.avatarImg} />
                    ) : (
                      <span className={styles.avatarInitial}>{member.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{member.name}</span>
                    {/* Type indicator dots */}
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
            })}
          </div>

          {/* Missing callout */}
          {memberComplete < memberTotal && (
            <div
              className={styles.missingCallout}
              onClick={() => navigate(project ? `/teams/${project.slug || project.id}/squad` : '/squad')}
            >
              <span className={styles.missingIcon}><AlertTriangle size={14} /></span>
              <span className={styles.missingText}>
                {memberTotal - memberComplete} speler{memberTotal - memberComplete > 1 ? 's' : ''} onvolledig
              </span>
              <span className={styles.missingArrow}><ChevronRight size={14} /></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
