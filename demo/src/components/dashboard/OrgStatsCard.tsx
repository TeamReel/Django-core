import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { TrendingUp, ChevronRight } from 'lucide-react';
import type { Organisation } from '../../types';
import { routes } from '../../routes';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './DashboardSummaries.module.css';

export const OrgStatsCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as Organisation | null;
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!org) return null;

  const clubsCount = org.clubs_count || org.project_count || 0;
  const teamsCount = org.teams_count || 0;

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
          <TrendingUp size={18} />
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardValue}>{teamsCount} teams</div>
          <div className={styles.cardLabel}>Organisatie</div>
        </div>
        <ChevronRight size={16} className={styles.cardArrow} />
      </div>

      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Organisatie overzicht"
        icon={<TrendingUp size={18} />}
      >
        <div className={styles.miniStats}>
          <div className={styles.miniStat}>
            <span className={styles.miniValue}>{clubsCount}</span>
            <span className={styles.miniLabel}>Clubs</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniValue}>{teamsCount}</span>
            <span className={styles.miniLabel}>Teams</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniValue}>{org.matches_count || 0}</span>
            <span className={styles.miniLabel}>Wedstrijden</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniValue}>{org.member_count || 0}</span>
            <span className={styles.miniLabel}>Leden</span>
          </div>
        </div>

        <button
          className={styles.sheetNavLink}
          onClick={() => {
            setSheetOpen(false);
            navigate(routes.orgDetailLegacy({ orgId: org.slug || '' }));
          }}
        >
          Bekijk organisatie <ChevronRight size={14} />
        </button>
      </NavigationSheet>
    </>
  );
};
