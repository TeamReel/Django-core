import React from 'react';
import { Alert } from '@django-core/design-system';
import { ChevronRight } from 'lucide-react';
import ov from './ClubOverviewTab.module.css';
import type { Project } from './teamDetailTypes';

type Period = {
  id: string;
  name: string;
  slug?: string;
  project_id?: string | number;
  project?: { id?: string | number };
  parent_period_id?: string | number | null;
  parent_period?: { id?: string | number } | null;
  type?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type OverviewMember = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export interface ClubOverviewTabProps {
  club: { name?: string; slug?: string; metadata?: Record<string, unknown>; [key: string]: unknown } | null;
  org: { name?: string; [key: string]: unknown } | null;
  overviewError: string | null;
  overviewLoading: boolean;
  overviewTeams: Project[];
  overviewSeasons: Period[];
  overviewMembers: OverviewMember[];
  overviewCounts: { teams: number; seasons: number; members: number } | null;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  navigate: (path: string) => void;
  makeTabHref: (tabId: string) => string;
}

export function ClubOverviewTab({
  club,
  org,
  overviewError,
  overviewLoading,
  overviewTeams,
  overviewSeasons,
  overviewMembers,
  overviewCounts,
  orgKeyForRoutes,
  clubKeyForRoutes,
  navigate,
  makeTabHref,
}: ClubOverviewTabProps) {
  const clubLocation = String((club?.metadata?.identity as Record<string, unknown> | undefined)?.default_location || '').trim();

  return (
    <div className={ov.overviewRoot}>
      {overviewError && <Alert variant="error">{overviewError}</Alert>}

      {/* ── Hero card ── */}
      <div className={ov.heroCard}>
        <div className={ov.heroTitle}>{club?.name || 'Club'}</div>
        <div className={ov.heroSubtitle}>
          {org?.name || 'Federatie'}{clubLocation ? ` \u00B7 ${clubLocation}` : ''}
        </div>
        <div className={ov.heroStats}>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {overviewLoading ? '…' : overviewCounts?.teams ?? '—'}
            </span>
            <span className={ov.heroStatLabel}>Teams</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {overviewLoading ? '…' : overviewCounts?.seasons ?? '—'}
            </span>
            <span className={ov.heroStatLabel}>Seizoenen</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {overviewLoading ? '…' : overviewCounts?.members ?? '—'}
            </span>
            <span className={ov.heroStatLabel}>Leden</span>
          </div>
        </div>
      </div>

      {/* ── Teams ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Teams</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('teams'))}>
            Alle teams →
          </button>
        </div>
        {overviewLoading && overviewTeams.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : overviewTeams.length === 0 ? (
          <div className={ov.emptyText}>Geen teams gevonden.</div>
        ) : (
          overviewTeams.map((t) => {
            const teamKey = String(t?.slug || t?.id || '').trim();
            const teamPath =
              orgKeyForRoutes && clubKeyForRoutes && teamKey
                ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKey)}`
                : '';

            return (
              <div
                key={String(t.id)}
                className={ov.itemRow}
                onClick={() => teamPath && navigate(teamPath)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' && teamPath) navigate(teamPath); }}
              >
                <span className={ov.itemName}>{t.name}</span>
                <ChevronRight size={16} className={ov.itemChevron} />
              </div>
            );
          })
        )}
      </div>

      {/* ── Seizoenen ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Seizoenen</h3>
        </div>
        {overviewLoading && overviewSeasons.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : overviewSeasons.length === 0 ? (
          <div className={ov.emptyText}>Geen seizoenen gevonden.</div>
        ) : (
          overviewSeasons.map((s) => (
            <div key={String(s.id)} className={`${ov.itemRow} cursor-default`}>
              <span className={ov.itemName}>{String(s.name || 'Seizoen')}</span>
              <span className={ov.itemMeta}>{s.type || ''}</span>
            </div>
          ))
        )}
      </div>

      {/* ── Leden ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Leden</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('members'))}>
            Alle leden →
          </button>
        </div>
        {overviewLoading && overviewMembers.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : overviewMembers.length === 0 ? (
          <div className={ov.emptyText}>Geen leden gevonden.</div>
        ) : (
          overviewMembers.map((m) => {
            const label =
              `${String(m?.first_name || '').trim()} ${String(m?.last_name || '').trim()}`.trim() ||
              String(m?.email || '').trim() ||
              `User ${m.id}`;
            return (
              <div key={String(m.id)} className={`${ov.itemRow} cursor-default`}>
                <span className={ov.itemName}>{label}</span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Club details ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Club details</h3>
        </div>
        <div className={ov.infoGrid}>
          <div className={ov.infoRow}>
            <span className={ov.infoLabel}>Naam</span>
            <span className={ov.infoValue}>{club?.name || '—'}</span>
          </div>
          <div className={ov.infoRow}>
            <span className={ov.infoLabel}>Federatie</span>
            <span className={ov.infoValue}>{org?.name || '—'}</span>
          </div>
          {clubLocation && (
            <div className={ov.infoRow}>
              <span className={ov.infoLabel}>Locatie</span>
              <span className={ov.infoValue}>{clubLocation}</span>
            </div>
          )}
          <div className={ov.infoRow}>
            <span className={ov.infoLabel}>Slug</span>
            <span className={ov.infoValue}>{String(club?.slug || '—')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
