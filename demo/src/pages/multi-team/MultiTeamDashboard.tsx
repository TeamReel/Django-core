/**
 * MultiTeamDashboard — Cross-team overview for coaches managing multiple teams.
 *
 * Shows a card per team with key metrics (members, matches, seasons) and
 * an aggregated upcoming-matches calendar. Uses `useContextSwitcher()` to
 * get the organisation's projects, filtered to child teams.
 */
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Users,
  Calendar,
  Trophy,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import type { Project, Organisation } from '../../types';
import { PageHeader } from '../../components/ui';
import SmartEmptyState from '../../components/SmartEmptyState';
import styles from './MultiTeamDashboard.module.css';

/* ── Helpers ────────────────────────────────────────────────────────────── */

function isTeam(p: Project): boolean {
  return p.parent_id != null || p.parent_project != null || p.parent_project_id != null;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function MultiTeamDashboard() {
  const { context, organisations, projects, switchProject } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as Organisation | null;

  // Filter to teams only (child projects)
  const teams = useMemo(
    () => (projects as unknown as Project[]).filter(isTeam),
    [projects],
  );

  // All orgs with team counts for the org summary
  const orgSummary = useMemo(
    () =>
      (organisations as Organisation[])
        .filter((o) => o.is_active !== false)
        .map((o) => ({
          ...o,
          teamCount: o.teams_count ?? 0,
          memberCount: o.member_count ?? 0,
        })),
    [organisations],
  );

  /* ── Handlers ── */

  const handleTeamClick = useCallback(
    (team: Project) => {
      // Navigate to team detail page using org + club + team hierarchy
      const orgSlug = org?.slug ?? org?.id ?? '';
      const parentSlug =
        (typeof team.parent_project === 'object' && team.parent_project?.slug) ||
        (typeof team.parent === 'object' && team.parent?.slug) ||
        '';
      const teamSlug = team.slug ?? team.id;

      if (parentSlug) {
        navigate(`/${encodeURIComponent(orgSlug)}/${encodeURIComponent(parentSlug)}/${encodeURIComponent(teamSlug)}`);
      } else {
        navigate(`/${encodeURIComponent(orgSlug)}/projects/${encodeURIComponent(teamSlug)}`);
      }
    },
    [navigate, org],
  );

  /* ── Render ── */

  return (
    <div className={styles.page}>
      <PageHeader
        title="Mijn Teams"
        subtitle={
          org
            ? `${teams.length} team${teams.length !== 1 ? 's' : ''} in ${org.name}`
            : `${teams.length} team${teams.length !== 1 ? 's' : ''}`
        }
      />

      {/* Org summary bar (when user has multiple orgs) */}
      {orgSummary.length > 1 && (
        <section className={styles.orgBar} aria-label="Organisatie-overzicht">
          {orgSummary.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`${styles.orgChip} ${o.id === org?.id ? styles.orgChipActive : ''}`}
              onClick={() => {
                void switchProject?.(o as never);
              }}
            >
              <span className="fw-600">{o.name}</span>
              <span className={styles.orgChipMeta}>
                {o.teamCount} team{o.teamCount !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </section>
      )}

      {/* Team grid */}
      {teams.length === 0 ? (
        <SmartEmptyState type="members" />
      ) : (
        <div className={styles.grid}>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={styles.teamCard}
              onClick={() => handleTeamClick(team)}
              aria-label={`Ga naar ${team.name}`}
            >
              <div className={styles.teamHeader}>
                <h3 className={`fs-16 fw-700 ${styles.teamName}`}>{team.name}</h3>
                <ChevronRight size={16} className={styles.chevron} />
              </div>

              <div className={styles.teamStats}>
                <div className={styles.stat}>
                  <Users size={14} aria-hidden="true" />
                  <span>{team.member_count ?? 0} leden</span>
                </div>
                <div className={styles.stat}>
                  <Calendar size={14} aria-hidden="true" />
                  <span>{team.matches_count ?? 0} wedstrijden</span>
                </div>
                <div className={styles.stat}>
                  <Trophy size={14} aria-hidden="true" />
                  <span>{team.seasons_count ?? 0} seizoenen</span>
                </div>
              </div>

              {team.status && (
                <span
                  className={`${styles.statusBadge} ${
                    team.status === 'active' ? styles.statusActive : styles.statusArchived
                  }`}
                >
                  {team.status === 'active' ? 'Actief' : 'Gearchiveerd'}
                </span>
              )}

              <div className={styles.teamFooter}>
                <span className="fs-12 text-muted">Bekijk team</span>
                <ArrowUpRight size={12} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
