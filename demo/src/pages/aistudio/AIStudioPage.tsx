/**
 * AIStudioPage — Studio History (complete redesign)
 *
 * Premium mobile-first content history page. Shows all generated content
 * grouped by content type with horizontal scrolling sections, live video
 * job status, and rich preview cards.
 *
 * Route: /studio
 */

import React, { useState, useRef, useCallback } from 'react';
import { PullToRefresh, Badge } from '@django-core/design-system';
import {
  CheckCircle2, AlertCircle,
  Loader2, ChevronRight, Images, Film, Image as ImageIcon, Sparkles,
  LayoutGrid, CalendarDays, X,
} from 'lucide-react';
import { useStudioData, type VideoJobSummary, type ContentGroup, type MatchGroup } from './useStudioData';
import type { ContentItem } from '../content/contentLibraryTypes';
import { StudioContentCard, StudioPreviewModal, ViewAllSheet, type ViewAllData, type ViewMode } from './StudioCards';
import styles from './AIStudioPage.module.css';

// ============================================================================
// Phase Headers — label + colour accent per match phase
// ============================================================================

const PHASE_META: Record<string, { label: string; accent: string; icon: string }> = {
  pre_match: { label: 'Voor de wedstrijd', accent: 'var(--studio-phase-pre, #3b82f6)', icon: '📋' },
  during_match: { label: 'Tijdens de wedstrijd', accent: 'var(--studio-phase-during, #f59e0b)', icon: '⚡' },
  post_match: { label: 'Na de wedstrijd', accent: 'var(--studio-phase-post, #10b981)', icon: '📊' },
  season: { label: 'Seizoen', accent: 'var(--studio-phase-season, #8b5cf6)', icon: '📅' },
  member: { label: 'Leden', accent: 'var(--studio-phase-member, #ec4899)', icon: '👤' },
  other: { label: 'Overig', accent: 'var(--studio-phase-other, #6b7280)', icon: '📄' },
};

// ============================================================================
// Utility
// ============================================================================

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Zojuist';
  if (diffMin < 60) return `${diffMin} min geleden`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} uur geleden`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'dag' : 'dagen'} geleden`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function getJobTypeLabel(jobType: string): string {
  const labels: Record<string, string> = {
    lineup: 'Lineup Video',
    goal_celebration: 'Goal Celebration',
    match_intro: 'Match Intro',
    then_vs_now: 'Toen vs Nu',
    transcode: 'Transcode',
    compose: 'Compositie',
    thumbnail: 'Thumbnail',
  };
  return labels[jobType] || jobType;
}

// ============================================================================
// StudioContentCard — Single content item thumbnail
// ============================================================================

// ============================================================================
// StudioSection — One content-type section with horizontal scroll
// ============================================================================

function StudioSection({
  group,
  onPreview,
  onViewAll,
  viewMode = 'type',
}: {
  group: ContentGroup;
  onPreview: (item: ContentItem) => void;
  onViewAll: (group: ContentGroup) => void;
  viewMode?: ViewMode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleRow}>
          <span className={styles.sectionIcon}>{group.icon}</span>
          <h3 className={styles.sectionTitle}>{group.label}</h3>
          <Badge size="sm" variant="default">{group.items.length}</Badge>
        </div>
        {group.items.length > 3 && (
          <button className={styles.sectionViewAll} onClick={() => onViewAll(group)} type="button">
            Bekijk alles <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className={styles.sectionScroll} ref={scrollRef}>
        {group.items.slice(0, 20).map((item) => (
          <StudioContentCard key={item.id} item={item} onPreview={onPreview} viewMode={viewMode} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// VideoJobCard — Active or recently completed video job
// ============================================================================

function VideoJobCard({ job }: { job: VideoJobSummary }) {
  const isActive = job.status === 'queued' || job.status === 'processing';
  const isFailed = job.status === 'failed';
  const isCompleted = job.status === 'completed';

  return (
    <div className={styles.jobCard} data-status={job.status}>
      {/* Status icon */}
      <div className={styles.jobIcon}>
        {isActive && <Loader2 size={18} className={styles.jobSpinner} />}
        {isCompleted && <CheckCircle2 size={18} />}
        {isFailed && <AlertCircle size={18} />}
        {job.status === 'cancelled' && <X size={18} />}
      </div>

      {/* Info */}
      <div className={styles.jobInfo}>
        <span className={styles.jobType}>{getJobTypeLabel(job.job_type)}</span>
        <span className={styles.jobMeta}>
          {isActive && job.progress_percent > 0
            ? `${Math.round(job.progress_percent)}%`
            : isActive ? 'Wachtrij...' : ''}
          {isFailed && (job.error_message ? job.error_message.slice(0, 80) : 'Mislukt')}
          {isCompleted && formatRelativeDate(job.completed_at || job.created_at)}
        </span>
      </div>

      {/* Progress bar for active jobs */}
      {isActive && (
        <div className={styles.jobProgress}>
          <div className={styles.jobProgressFill} style={{ width: `${job.progress_percent || 5}%` }} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ActiveJobsStrip — Shows processing/queued jobs at top
// ============================================================================

function ActiveJobsStrip({ jobs }: { jobs: VideoJobSummary[] }) {
  if (jobs.length === 0) return null;

  return (
    <div className={styles.activeJobsStrip}>
      <div className={styles.activeJobsHeader}>
        <Loader2 size={14} className={styles.jobSpinner} />
        <span className={styles.activeJobsTitle}>
          {jobs.length} video{jobs.length > 1 ? "'s" : ''} in verwerking
        </span>
      </div>
      <div className={styles.activeJobsList}>
        {jobs.map((job) => (
          <VideoJobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AIStudioPage() {
  const data = useStudioData();

  const [viewMode, setViewMode] = useState<ViewMode>('type');
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [viewAllData, setViewAllData] = useState<ViewAllData | null>(null);

  const handleRefresh = useCallback(async () => {
    await data.refresh();
  }, [data]);

  // Group sections by phase (for type view)
  const groupsByPhase = data.contentGroups.reduce<Record<string, ContentGroup[]>>((acc, g) => {
    if (!acc[g.phase]) acc[g.phase] = [];
    acc[g.phase].push(g);
    return acc;
  }, {});

  const phases = Object.keys(groupsByPhase);

  const hasContent = !data.loading && !data.error && (data.contentGroups.length > 0 || data.matchGroups.length > 0 || data.nonMatchGroup);

  return (
    <PullToRefresh onRefresh={handleRefresh} pullText="Trek om te verversen" refreshingText="Verversen...">
      <div className={styles.page}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerTitleBlock}>
              <Sparkles size={22} className={styles.headerIcon} />
              <div>
                <h1 className={styles.headerTitle}>Studio</h1>
                <p className={styles.headerSub}>Je gegenereerde content</p>
              </div>
            </div>
            {/* Stats pills */}
            {!data.loading && data.totalItems > 0 && (
              <div className={styles.statsPills}>
                <span className={styles.statPill}>
                  <Images size={13} /> {data.totalItems}
                </span>
                {data.totalVideos > 0 && (
                  <span className={styles.statPill}>
                    <Film size={13} /> {data.totalVideos}
                  </span>
                )}
                {data.totalImages > 0 && (
                  <span className={styles.statPill}>
                    <ImageIcon size={13} /> {data.totalImages}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* View mode toggle */}
          {hasContent && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewToggleBtn} ${viewMode === 'type' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setViewMode('type')}
                type="button"
              >
                <LayoutGrid size={14} /> Per type
              </button>
              <button
                className={`${styles.viewToggleBtn} ${viewMode === 'match' ? styles.viewToggleBtnActive : ''}`}
                onClick={() => setViewMode('match')}
                type="button"
              >
                <CalendarDays size={14} /> Per wedstrijd
              </button>
            </div>
          )}
        </header>

        {/* ── Active video jobs strip ── */}
        <ActiveJobsStrip jobs={data.activeJobs} />

        {/* ── Loading ── */}
        {data.loading && (
          <div className={styles.loadingState}>
            <Loader2 size={28} className={styles.jobSpinner} />
            <span>Content laden...</span>
          </div>
        )}

        {/* ── Error ── */}
        {data.error && (
          <div className={styles.errorState}>
            <AlertCircle size={24} />
            <span>{data.error}</span>
            <button className={styles.retryBtn} onClick={() => data.refresh()} type="button">
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {!data.loading && !data.error && data.contentGroups.length === 0 && data.matchGroups.length === 0 && !data.nonMatchGroup && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🎬</span>
            <h2 className={styles.emptyTitle}>Nog geen content</h2>
            <p className={styles.emptySub}>
              Genereer je eerste content — flyers, line-ups, video's en meer — via het + menu.
            </p>
          </div>
        )}

        {/* ========== TYPE VIEW ========== */}
        {viewMode === 'type' && !data.loading && !data.error && phases.map((phase) => {
          const meta = PHASE_META[phase] || PHASE_META.other;
          const groups = groupsByPhase[phase];
          return (
            <div key={phase} className={styles.phaseBlock}>
              <div className={styles.phaseHeader} style={{ '--phase-accent': meta.accent } as React.CSSProperties}>
                <span className={styles.phaseIcon}>{meta.icon}</span>
                <span className={styles.phaseLabel}>{meta.label}</span>
                <span className={styles.phaseLine} />
              </div>

              {groups.map((group) => (
                <StudioSection
                  key={group.key}
                  group={group}
                  onPreview={(item) => setPreviewItem(item)}
                  onViewAll={(g) => setViewAllData({ title: `${g.icon} ${g.label}`, items: g.items, viewMode: 'type' })}
                  viewMode="type"
                />
              ))}
            </div>
          );
        })}

        {/* ========== MATCH VIEW ========== */}
        {viewMode === 'match' && !data.loading && !data.error && (
          <>
            {/* Non-match content first (Seizoen & Leden) */}
            {data.nonMatchGroup && data.nonMatchGroup.items.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleRow}>
                    <span className={styles.sectionIcon}>📅</span>
                    <h3 className={styles.sectionTitle}>Seizoen &amp; Leden</h3>
                    <Badge size="sm" variant="default">{data.nonMatchGroup.items.length}</Badge>
                  </div>
                  {data.nonMatchGroup.items.length > 3 && (
                    <button
                      className={styles.sectionViewAll}
                      onClick={() => setViewAllData({ title: '📅 Seizoen & Leden', items: data.nonMatchGroup!.items, viewMode: 'match' })}
                      type="button"
                    >
                      Bekijk alles <ChevronRight size={14} />
                    </button>
                  )}
                </div>
                <div className={styles.sectionScroll}>
                  {data.nonMatchGroup.items.slice(0, 20).map((item) => (
                    <StudioContentCard key={item.id} item={item} onPreview={(it) => setPreviewItem(it)} viewMode="match" />
                  ))}
                </div>
              </section>
            )}

            {/* Match sections — same horizontal scroll layout as type view */}
            {data.matchGroups.length > 0 ? (
              data.matchGroups.map((match) => {
                const dateStr = match.date
                  ? new Date(match.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
                  : '';
                const scoreStr =
                  match.scoreHome != null && match.scoreAway != null
                    ? `${match.scoreHome}-${match.scoreAway}`
                    : '';
                const subtitle = [
                  dateStr,
                  scoreStr,
                  match.homeAway === 'home' ? 'Thuis' : match.homeAway === 'away' ? 'Uit' : '',
                ].filter(Boolean).join(' · ');

                return (
                  <section key={match.activityId} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionTitleRow}>
                        <span className={styles.sectionIcon}>⚽</span>
                        <div className={styles.matchTitleBlock}>
                          <h3 className={styles.sectionTitle}>{match.title}</h3>
                          {subtitle && <span className={styles.matchSubtitle}>{subtitle}</span>}
                        </div>
                        <Badge size="sm" variant="default">{match.items.length}</Badge>
                      </div>
                      {match.items.length > 3 && (
                        <button
                          className={styles.sectionViewAll}
                          onClick={() => setViewAllData({ title: `⚽ ${match.title}`, items: match.items, viewMode: 'match' })}
                          type="button"
                        >
                          Bekijk alles <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                    <div className={styles.sectionScroll}>
                      {match.items.slice(0, 20).map((item) => (
                        <StudioContentCard key={item.id} item={item} onPreview={(it) => setPreviewItem(it)} viewMode="match" />
                      ))}
                    </div>
                  </section>
                );
              })
            ) : (
              !data.nonMatchGroup && (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>⚽</span>
                  <h2 className={styles.emptyTitle}>Geen wedstrijd-content</h2>
                  <p className={styles.emptySub}>
                    Content gekoppeld aan wedstrijden verschijnt hier.
                  </p>
                </div>
              )
            )}
          </>
        )}

        {/* ── Recently completed video jobs ── */}
        {data.recentCompletedJobs.length > 0 && (
          <div className={styles.recentJobsSection}>
            <h3 className={styles.recentJobsTitle}>
              <CheckCircle2 size={16} /> Recent verwerkt
            </h3>
            <div className={styles.recentJobsList}>
              {data.recentCompletedJobs.map((job) => (
                <VideoJobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}

        {/* Bottom spacer for mobile nav */}
        <div className={styles.bottomSpacer} />
      </div>

      {/* ── Preview modal ── */}
      {previewItem && (
        <StudioPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {/* ── View all bottom sheet ── */}
      <ViewAllSheet
        data={viewAllData}
        isOpen={!!viewAllData}
        onClose={() => setViewAllData(null)}
        onPreview={(item) => setPreviewItem(item)}
      />
    </PullToRefresh>
  );
}
