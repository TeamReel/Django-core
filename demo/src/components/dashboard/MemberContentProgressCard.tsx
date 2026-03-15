/**
 * MemberContentProgressCard — Shows content completeness per team member.
 *
 * For each member, shows how many content types have been generated
 * (e.g. profile photo, in-tenue, closeup) as a progress bar.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Users, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './MemberContentProgressCard.module.css';

/** Expected member content types for a complete profile */
const MEMBER_CONTENT_TYPES = [
  'profile_photo',
  'in_tenue',
  'closeup',
  'short_intro',
] as const;

const TYPE_LABELS: Record<string, string> = {
  profile_photo: 'Foto',
  in_tenue: 'Tenue',
  closeup: 'Close-up',
  short_intro: 'Intro',
  legacy_photo: 'Legacy',
  celebration: 'Viering',
  legacy_in_tenue: 'Legacy tenue',
};

interface MemberProgress {
  id: string;
  name: string;
  avatarUrl?: string;
  completedTypes: string[];
  totalExpected: number;
}

export const MemberContentProgressCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const org = context.organisation;
  const project = context.project;

  // Parallel queries — no waterfall (D5/D6)
  const { data: membersData, isLoading: membersLoading } = useProjectMembers(
    org?.slug,
    project?.slug,
  );

  const genFilters = useMemo(() => {
    if (!project) return undefined;
    return { status: 'completed', project: project.id } as Record<string, string>;
  }, [project?.id]);

  const { data: genData, isLoading: genLoading } = useGenerativeRequests(genFilters);

  const loading = membersLoading || genLoading;

  // Client-side join: members × generative requests → progress list
  const members = useMemo<MemberProgress[]>(() => {
    const memberList = membersData?.results ?? [];
    const genItems = genData?.results ?? [];
    if (memberList.length === 0) return [];

    // Build map: member_id -> set of completed subtypes
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

    // Build progress list
    return memberList
      .slice(0, 20)
      .map((m: any) => {
        const userId = String(m.user?.id || m.id);
        const memberId = String(m.id);
        const completedSet = memberContentMap.get(userId) || memberContentMap.get(memberId) || new Set();
        const name = m.user?.first_name
          ? `${m.user.first_name} ${m.user.last_name || ''}`.trim()
          : m.user_name || m.name || 'Onbekend';
        return {
          id: memberId,
          name,
          avatarUrl: m.user?.avatar_url || m.avatar_url,
          completedTypes: Array.from(completedSet),
          totalExpected: MEMBER_CONTENT_TYPES.length,
        };
      })
      .sort((a: MemberProgress, b: MemberProgress) => a.completedTypes.length - b.completedTypes.length);
  }, [membersData, genData]);

  if (!project) return null;
  if (!loading && members.length === 0) return null;

  const totalComplete = members.filter(m => m.completedTypes.length >= m.totalExpected).length;
  const teamPercent = members.length > 0
    ? Math.round((members.reduce((s, m) => s + Math.min(m.completedTypes.length, m.totalExpected), 0) / (members.length * MEMBER_CONTENT_TYPES.length)) * 100)
    : 0;

  return (
    <>
    <div className={styles.card}>
      <div className={styles.header}>
        <Users size={16} />
        <span className={styles.title}>Spelers content</span>
        <span className={styles.teamBadge}>
          {teamPercent}% compleet
        </span>
        <button className={styles.seeAll} onClick={() => setSheetOpen(true)}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Team-level progress bar */}
      <div className={styles.teamBar}>
        <div className={styles.teamBarTrack}>
          <div
            className={styles.teamBarFill}
            style={{ width: `${teamPercent}%` }}
          />
        </div>
        <span className={styles.teamBarLabel}>
          {totalComplete}/{members.length} spelers volledig
        </span>
      </div>

      {loading ? (
        <div className={styles.memberList}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.memberShimmer} />
          ))}
        </div>
      ) : (
        <div className={styles.memberList}>
          {members.slice(0, 8).map(member => {
            const percent = Math.round((Math.min(member.completedTypes.length, member.totalExpected) / member.totalExpected) * 100);
            const isComplete = percent >= 100;
            return (
              <div key={member.id} className={styles.memberRow}>
                <div className={styles.memberAvatar}>
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className={styles.avatarImg} loading="lazy" />
                  ) : (
                    <span className={styles.avatarInitial}>
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{member.name}</span>
                  <div className={styles.progressTrack}>
                    <div
                      className={`${styles.progressFill} ${isComplete ? styles.progressComplete : ''}`}
                      style={{ width: `${Math.max(4, percent)}%` }}
                    />
                  </div>
                </div>
                <span className={`${styles.memberPercent} ${isComplete ? styles.percentComplete : ''}`}>
                  {isComplete ? <CheckCircle2 size={14} /> : `${percent}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {/* ── Member Content Progress Sheet ───────────────────── */}
    <NavigationSheet
      isOpen={sheetOpen}
      onClose={() => setSheetOpen(false)}
      title="Spelers content"
      icon={<Users size={18} />}
    >
      {/* Team-level progress bar */}
      <div className={styles.teamBar}>
        <div className={styles.teamBarTrack}>
          <div className={styles.teamBarFill} style={{ width: `${teamPercent}%` }} />
        </div>
        <span className={styles.teamBarLabel}>
          {totalComplete}/{members.length} spelers volledig
        </span>
      </div>

      {/* Full member list (all members) */}
      <div className={styles.memberList}>
        {members.map(member => {
          const percent = Math.round((Math.min(member.completedTypes.length, member.totalExpected) / member.totalExpected) * 100);
          const isComplete = percent >= 100;
          return (
            <div key={member.id} className={styles.memberRow}>
              <div className={styles.memberAvatar}>
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt="" className={styles.avatarImg} loading="lazy" />
                ) : (
                  <span className={styles.avatarInitial}>
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{member.name}</span>
                <div className={styles.progressTrack}>
                  <div
                    className={`${styles.progressFill} ${isComplete ? styles.progressComplete : ''}`}
                    style={{ width: `${Math.max(4, percent)}%` }}
                  />
                </div>
              </div>
              <span className={`${styles.memberPercent} ${isComplete ? styles.percentComplete : ''}`}>
                {isComplete ? <CheckCircle2 size={14} /> : `${percent}%`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Navigate to squad */}
      <button
        onClick={() => { setSheetOpen(false); navigate(`/teams/${project.slug || project.id}/squad`); }}
        style={{ marginTop: 16, width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        Ga naar squad <ChevronRight size={14} />
      </button>
    </NavigationSheet>
    </>
  );
};
