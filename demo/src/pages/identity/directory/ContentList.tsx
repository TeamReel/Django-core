import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@django-core/design-system';
import { SkeletonList } from '@/components/Skeleton';
import SmartEmptyState from '@/components/SmartEmptyState';
import { generativeApi } from '@/api';
import type { GenerationJob } from '@/hooks/useGenerationJobs';
import cl from './ContentList.module.css';
import { logger } from '@/utils/logger';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDur(s: number | null | undefined): string {
  if (s == null) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function fmtCost(eur: number | null | undefined): string {
  if (eur == null) return '—';
  return `€${eur.toFixed(eur < 0.01 ? 4 : 2)}`;
}

function fmtTokens(input: number | null | undefined, output: number | null | undefined): string {
  if (input == null && output == null) return '—';
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  return `${fmt(input ?? 0)} / ${fmt(output ?? 0)}`;
}

const statusColors: Record<string, string> = {
  completed: cl.pillCompleted,
  processing: cl.pillProcessing,
  queued: cl.pillQueued,
  waiting: cl.pillWaiting,
  failed: cl.pillFailed,
  cancelled: cl.pillCancelled,
};

const approvalColors: Record<string, string> = {
  pending_review: cl.pillPendingReview,
  approved: cl.pillApproved,
  rejected: cl.pillRejected,
};

function Pill({ text, colors }: { text: string; colors: Record<string, string> }) {
  const cls = colors[text] ?? cl.pillDefault;
  return (
    <span className={`${cl.pill} ${cls}`}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

const thSort = 'dir-th cursor-pointer';
const thSortR = 'dir-th text-right cursor-pointer';

type SortCol = 'created_at' | 'duration_seconds' | 'content_duration_seconds' | 'estimated_cost_eur' | 'provider' | 'status';

// ── Component ────────────────────────────────────────────────────────────────

export const ContentList: React.FC = () => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [sortCol, setSortCol] = useState<SortCol>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { results } = await generativeApi.listJobs({ limit: 200 });
        if (!cancelled) setJobs(results as unknown as GenerationJob[]);
      } catch (e) {
        logger.error('Failed to load content', e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filterOptions = useMemo(() => {
    const statuses = new Set<string>(), providers = new Set<string>(), clubs = new Set<string>();
    for (const j of jobs) {
      statuses.add(j.status);
      if (j.provider) providers.add(j.provider);
      const club = j.club_name || j.project_name || '';
      if (club) clubs.add(club);
    }
    return { statuses: [...statuses].sort(), providers: [...providers].sort(), clubs: [...clubs].sort() };
  }, [jobs]);

  const filtered = useMemo(() => {
    let list = [...jobs];
    if (statusFilter) list = list.filter((j) => j.status === statusFilter);
    if (typeFilter) list = list.filter((j) => j.output_type === typeFilter);
    if (providerFilter) list = list.filter((j) => j.provider === providerFilter);
    if (approvalFilter) list = list.filter((j) => (j.approval_status || 'none') === approvalFilter);
    if (clubFilter) list = list.filter((j) => (j.club_name || j.project_name || '') === clubFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((j) =>
        j.label?.toLowerCase().includes(q) || j.membership_name?.toLowerCase().includes(q) ||
        j.project_name?.toLowerCase().includes(q) || j.model?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortCol === 'duration_seconds') cmp = (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0);
      else if (sortCol === 'content_duration_seconds') cmp = (a.content_duration_seconds ?? 0) - (b.content_duration_seconds ?? 0);
      else if (sortCol === 'estimated_cost_eur') cmp = (a.estimated_cost_eur ?? 0) - (b.estimated_cost_eur ?? 0);
      else if (sortCol === 'provider') cmp = (a.provider ?? '').localeCompare(b.provider ?? '');
      else if (sortCol === 'status') cmp = (a.status ?? '').localeCompare(b.status ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [jobs, statusFilter, typeFilter, providerFilter, approvalFilter, clubFilter, searchQuery, sortCol, sortDir]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  };
  const arrow = (col: SortCol) => (sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');


  const totalCost = useMemo(() => filtered.reduce((s, j) => s + (j.estimated_cost_eur ?? 0), 0), [filtered]);

  if (loading) return <SkeletonList count={4} variant="card" />;
  if (error) return <div className="p-20 text-error">Error: {error}</div>;

  return (
    <div className="flex-col gap-12">
      {/* ── Filter bar ──────────────────────────────────────────────────────────── */}
      <div className="flex-row gap-8 flex-wrap">
        <input type="text" placeholder="Search label, member, model…" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} className={`${cl.filterSelect} ${cl.filterSearch}`} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cl.filterSelect}>
          <option value="">All Status</option>
          {filterOptions.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={cl.filterSelect}>
          <option value="">All Types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className={cl.filterSelect}>
          <option value="">All Providers</option>
          {filterOptions.providers.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className={cl.filterSelect}>
          <option value="">All Approvals</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="none">No Review</option>
        </select>
        {filterOptions.clubs.length > 1 && (
          <select value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} className={cl.filterSelect}>
            <option value="">All Clubs</option>
            {filterOptions.clubs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(statusFilter || typeFilter || providerFilter || approvalFilter || clubFilter || searchQuery) && (
          <button onClick={() => { setStatusFilter(''); setTypeFilter(''); setProviderFilter(''); setApprovalFilter(''); setClubFilter(''); setSearchQuery(''); }}
            className="action-btn">Clear</button>
        )}
        <span className="ml-auto fs-12 text-muted">
          {filtered.length} / {jobs.length} items · Est. {fmtCost(totalCost)}
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <SmartEmptyState type="content" hideActions />
      ) : (
      <Card>
        <div className="overflow-x-auto">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="dir-th">Type</th>
                <th className="dir-th">Label</th>
                <th className="dir-th">Member</th>
                <th className="dir-th">Club</th>
                <th className="dir-th">Team</th>
                <th className={thSort} onClick={() => toggleSort('provider')}>Provider{arrow('provider')}</th>
                <th className="dir-th">Model</th>
                <th className={thSort} onClick={() => toggleSort('status')}>Status{arrow('status')}</th>
                <th className="dir-th">Approval</th>
                <th className={thSort} onClick={() => toggleSort('created_at')}>Created{arrow('created_at')}</th>
                <th className={thSortR} onClick={() => toggleSort('duration_seconds')}>Gen. Time{arrow('duration_seconds')}</th>
                <th className={thSortR} onClick={() => toggleSort('content_duration_seconds')}>Content Dur.{arrow('content_duration_seconds')}</th>
                <th className="dir-th text-right">Tokens (in/out)</th>
                <th className={thSortR} onClick={() => toggleSort('estimated_cost_eur')}>Cost{arrow('estimated_cost_eur')}</th>
                <th className="dir-th text-right">Variants</th>
                <th className="dir-th">Preview</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.task_id} className={cl.tableRow}>
                  <td className="dir-td">
                    <span className={cl.typeIcon}>{job.output_type === 'image' ? 'IMG' : 'VID'}</span>
                    <span className="fs-11 text-muted">{job.output_asset_type || job.output_type}</span>
                  </td>
                  <td className="dir-td-text">{job.label || '—'}</td>
                  <td className="dir-td-text">{job.membership_name || '—'}</td>
                  <td className="dir-td-text">{job.club_name || '—'}</td>
                  <td className="dir-td-text">{job.project_name || '—'}</td>
                  <td className="dir-td fw-600">{job.provider || '—'}</td>
                  <td className="dir-td-text">{job.model || '—'}</td>
                  <td className="dir-td"><Pill text={job.status} colors={statusColors} /></td>
                  <td className="dir-td">
                    {job.approval_status ? <Pill text={job.approval_status} colors={approvalColors} /> : <span className={cl.dash}>—</span>}
                  </td>
                  <td className="dir-td">
                    <span className="fs-12 whitespace-nowrap">{fmtDate(job.created_at)}</span>{' '}
                    <span className={cl.timeLabel}>{fmtTime(job.created_at)}</span>
                  </td>
                  <td className="dir-td text-right tabular-nums">{fmtDur(job.duration_seconds)}</td>
                  <td className="dir-td text-right tabular-nums">{fmtDur(job.content_duration_seconds)}</td>
                  <td className="dir-td text-right tabular-nums fs-11">{fmtTokens(job.estimated_input_tokens, job.estimated_output_tokens)}</td>
                  <td className="dir-td text-right tabular-nums">{fmtCost(job.estimated_cost_eur)}</td>
                  <td className="dir-td text-right">{job.variant_count ?? 0}</td>
                  <td className="dir-td">
                    {job.output_url
                      ? <a href={job.output_url} target="_blank" rel="noopener noreferrer" className="action-btn action-btn-primary text-decoration-none fs-11">View</a>
                      : <span className={cl.dash}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>
  );
};
