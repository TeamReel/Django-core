import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Users, ChevronRight } from 'lucide-react';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useAppSelection } from '../../hooks/useAppSelection';
import type { Organisation } from '../../types';
import { routes } from '../../routes';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './DashboardSummaries.module.css';

export const SquadReadinessCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as Organisation | null;
  const project = context.project;
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: membersData } = useProjectMembers(projectId);
  const members = membersData?.results ?? [];
  const memberCount = projectId
    ? (membersData?.count ?? members.length ?? 0)
    : (org?.member_count || 0);

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
          <div className={styles.cardValue}>{memberCount}</div>
          <div className={styles.cardLabel}>{project ? 'Selectie' : 'Leden'}</div>
        </div>
        <ChevronRight size={16} className={styles.cardArrow} />
      </div>

      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Selectie"
        icon={<Users size={18} />}
      >
        <div className={styles.squadBadge}>{memberCount} spelers</div>

        <div className={styles.squadList}>
          {members.map((m) => {
            const name = m.user?.first_name
              ? `${m.user.first_name} ${m.user.last_name || ''}`.trim()
              : 'Onbekend';
            const role = m.role || 'speler';
            const avatarUrl = m.user?.avatar_url;
            return (
              <div key={m.id} className={styles.squadRow}>
                <div className={styles.squadAvatar}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className={styles.squadAvatarImg} loading="lazy" />
                  ) : (
                    <span className={styles.squadAvatarInitial}>{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.squadInfo}>
                  <span className={styles.squadName}>{name}</span>
                  <span className={styles.squadRole}>{role}</span>
                </div>
              </div>
            );
          })}
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
