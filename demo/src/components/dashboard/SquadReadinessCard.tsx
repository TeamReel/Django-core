import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Users, ChevronRight, Check, X } from 'lucide-react';
import { useSquadReadiness } from '../../hooks/useSquadReadiness';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useAppSelection } from '../../hooks/useAppSelection';
import type { Organisation } from '../../types';
import { routes } from '../../routes';
import { NavigationSheet } from '../ui/NavigationSheet';
import { ReadinessRing } from './ReadinessRing';
import styles from './DashboardSummaries.module.css';

export const SquadReadinessCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as Organisation | null;
  const project = context.project;
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: readiness } = useSquadReadiness(projectId);
  const { data: membersData } = useProjectMembers(projectId);

  const memberCount = readiness?.total_members
    ?? membersData?.count
    ?? (org?.member_count || 0);
  const percent = readiness?.readiness_percent ?? 0;
  const hasReadinessData = !!readiness && readiness.total_members > 0;

  return (
    <>
      <div
        className={styles.summaryCard}
        onClick={() => setSheetOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSheetOpen(true); } }}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
      >
        <div className={`${styles.cardIcon} ${styles.iconPrimary}`}>
          <Users size={18} />
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardValue}>
            {memberCount}
            {hasReadinessData && (
              <span className={styles.readinessInline}>
                — {readiness.ready_members}/{readiness.total_members} gereed
              </span>
            )}
          </div>
          <div className={styles.cardLabel}>{project ? 'Selectie' : 'Leden'}</div>
        </div>
        {hasReadinessData ? (
          <ReadinessRing percent={percent} size={32} strokeWidth={3} aria-label={`Selectie gereedheid: ${percent}%`} />
        ) : (
          <ChevronRight size={16} className={styles.cardArrow} />
        )}
      </div>

      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Selectie"
        icon={<Users size={18} />}
      >
        {hasReadinessData && (
          <div className={styles.squadReadinessSummary}>
            <ReadinessRing percent={percent} size={48} strokeWidth={4} aria-label={`Selectie gereedheid: ${percent}%`} />
            <div>
              <div className={styles.squadReadinessLabel}>
                {readiness.ready_members} van {readiness.total_members} spelers gereed
              </div>
              <div className={styles.squadReadinessSub}>
                Kit: {readiness.kit_type}
              </div>
            </div>
          </div>
        )}

        <div className={styles.squadBadge}>{memberCount} spelers</div>

        <div className={styles.squadList}>
          {(readiness?.members ?? []).map((m) => (
            <div key={m.id} className={styles.squadRow}>
              <div className={styles.squadAvatar}>
                <span className={styles.squadAvatarInitial}>
                  {m.shirt_number ?? m.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={styles.squadInfo}>
                <span className={styles.squadName}>{m.name}</span>
                <span className={styles.squadRole}>{m.functional_role}</span>
              </div>
              <div className={styles.squadReadinessIcons}>
                {m.has_fullbody
                  ? <Check size={14} className={styles.readyIcon} aria-label="Fullbody beschikbaar" />
                  : <X size={14} className={styles.notReadyIcon} aria-label="Fullbody ontbreekt" />}
              </div>
            </div>
          ))}
        </div>

        <button
          className={styles.sheetNavLink}
          onClick={() => {
            setSheetOpen(false);
            if (project) navigate(`/teams/${project.slug || project.id}/squad`);
            else if (org) navigate(routes.orgDetailLegacy({ orgId: org.slug || '' }));
          }}
        >
          Bekijk volledige selectie <ChevronRight size={14} />
        </button>
      </NavigationSheet>
    </>
  );
};
