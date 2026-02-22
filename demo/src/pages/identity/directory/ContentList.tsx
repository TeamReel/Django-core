import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { getApiBaseUrl } from '../../../utils/apiBase';
import type { GenerationJob } from '../../../hooks/useGenerationJobs';
import {
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  compactTextTdStyle,
  actionButtonStyle,
} from '../../../utils/directoryStyles';

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

const statusColors: Record<string, { bg: string; fg: string }> = {
  completed: { bg: '#dcfce7', fg: '#166534' },
  processing: { bg: '#dbeafe', fg: '#1e40af' },
  queued: { bg: '#fef9c3', fg: '#854d0e' },
  waiting: { bg: '#fef9c3', fg: '#854d0e' },
  failed: { bg: '#fde2e2', fg: '#991b1b' },
  cancelled: { bg: '#f3f4f6', fg: '#6b7280' },
};

const approvalColors: Record<string, { bg: string; fg: string }> = {
  pending_review: { bg: '#fef3c7', fg: '#92400e' },
  approved: { bg: '#dcfce7', fg: '#166534' },
  rejected: { bg: '#fde2e2', fg: '#991b1b' },
};

function Pill({ text, colors }: { text: string; colors: Record<string, { bg: string; fg: string }> }) {
  const c = colors[text] ?? { bg: '#f3f4f6', fg: '#374151' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '4px 8px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', minWidth: 100,
};

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
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/api/v1/generative/jobs/?limit=200`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const payload = data.data ?? data;
        if (!cancelled) setJobs(payload.results ?? []);
      } catch (e) {
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

  const thSort: React.CSSProperties = { ...compactThStyle, cursor: 'pointer' };
  const thSortR: React.CSSProperties = { ...compactThStyle, cursor: 'pointer', textAlign: 'right' };

  const totalCost = useMemo(() => filtered.reduce((s, j) => s + (j.estimated_cost_eur ?? 0), 0), [filtered]);

  if (loading) return <LoadingState message="Loading content…" />;
  if (error) return <div style={{ padding: 20, color: '#991b1b' }}>Error: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search label, member, model…" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} style={{ ...selectStyle, minWidth: 180 }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Status</option>
          {filterOptions.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All Types</option>
          <option value="image">🖼️ Image</option>
          <option value="video">🎬 Video</option>
        </select>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} style={selectStyle}>
          <option value="">All Providers</option>
          {filterOptions.providers.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} style={selectStyle}>
          <option value="">All Approvals</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="none">No Review</option>
        </select>
        {filterOptions.clubs.length > 1 && (
          <select value={clubFilter} onChange={(e) => setClubFilter(e.target.value)} style={selectStyle}>
            <option value="">All Clubs</option>
            {filterOptions.clubs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(statusFilter || typeFilter || providerFilter || approvalFilter || clubFilter || searchQuery) && (
          <button onClick={() => { setStatusFilter(''); setTypeFilter(''); setProviderFilter(''); setApprovalFilter(''); setClubFilter(''); setSearchQuery(''); }}
            style={actionButtonStyle('neutral')}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {filtered.length} / {jobs.length} items · Est. {fmtCost(totalCost)}
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={compactThStyle}>Type</th>
                <th style={compactThStyle}>Label</th>
                <th style={compactThStyle}>Member</th>
                <th style={compactThStyle}>Club</th>
                <th style={compactThStyle}>Team</th>
                <th style={thSort} onClick={() => toggleSort('provider')}>Provider{arrow('provider')}</th>
                <th style={compactThStyle}>Model</th>
                <th style={thSort} onClick={() => toggleSort('status')}>Status{arrow('status')}</th>
                <th style={compactThStyle}>Approval</th>
                <th style={thSort} onClick={() => toggleSort('created_at')}>Created{arrow('created_at')}</th>
                <th style={thSortR} onClick={() => toggleSort('duration_seconds')}>Gen. Time{arrow('duration_seconds')}</th>
                <th style={thSortR} onClick={() => toggleSort('content_duration_seconds')}>Content Dur.{arrow('content_duration_seconds')}</th>
                <th style={{ ...compactThStyle, textAlign: 'right' }}>Tokens (in/out)</th>
                <th style={thSortR} onClick={() => toggleSort('estimated_cost_eur')}>Cost{arrow('estimated_cost_eur')}</th>
                <th style={{ ...compactThStyle, textAlign: 'right' }}>Variants</th>
                <th style={compactThStyle}>Preview</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={16} style={{ ...compactTdStyle, textAlign: 'center', color: '#9ca3af', padding: 24 }}>No content items found</td></tr>
              )}
              {filtered.map((job) => (
                <tr key={job.task_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={compactTdStyle}>
                    <span style={{ fontSize: 15, marginRight: 3 }}>{job.output_type === 'image' ? '🖼️' : '🎬'}</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{job.output_asset_type || job.output_type}</span>
                  </td>
                  <td style={compactTextTdStyle}>{job.label || '—'}</td>
                  <td style={compactTextTdStyle}>{job.membership_name || '—'}</td>
                  <td style={compactTextTdStyle}>{job.club_name || '—'}</td>
                  <td style={compactTextTdStyle}>{job.project_name || '—'}</td>
                  <td style={{ ...compactTdStyle, fontWeight: 600 }}>{job.provider || '—'}</td>
                  <td style={compactTextTdStyle}>{job.model || '—'}</td>
                  <td style={compactTdStyle}><Pill text={job.status} colors={statusColors} /></td>
                  <td style={compactTdStyle}>
                    {job.approval_status ? <Pill text={job.approval_status} colors={approvalColors} /> : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={compactTdStyle}>
                    <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(job.created_at)}</span>{' '}
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{fmtTime(job.created_at)}</span>
                  </td>
                  <td style={{ ...compactTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(job.duration_seconds)}</td>
                  <td style={{ ...compactTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(job.content_duration_seconds)}</td>
                  <td style={{ ...compactTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{fmtTokens(job.estimated_input_tokens, job.estimated_output_tokens)}</td>
                  <td style={{ ...compactTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCost(job.estimated_cost_eur)}</td>
                  <td style={{ ...compactTdStyle, textAlign: 'right' }}>{job.variant_count ?? 0}</td>
                  <td style={compactTdStyle}>
                    {job.output_url
                      ? <a href={job.output_url} target="_blank" rel="noopener noreferrer" style={{ ...actionButtonStyle('primary'), textDecoration: 'none', fontSize: 11 }}>View</a>
                      : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
