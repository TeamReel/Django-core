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

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
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

function Pill({ text, colorMap }: { text: string; colorMap: Record<string, { bg: string; fg: string }> }) {
  const c = colorMap[text] ?? { bg: '#f3f4f6', fg: '#374151' };
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {text.replace(/_/g, ' ')}
    </span>
  );
}

// ── Filter bar inline select style ──────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#fff',
  minWidth: 100,
};

// ── Main component ───────────────────────────────────────────────────────────

export const ContentList: React.FC = () => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // image | video
  const [providerFilter, setProviderFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort
  const [sortCol, setSortCol] = useState<'created_at' | 'duration_seconds' | 'provider' | 'status'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/api/v1/generative/jobs/?limit=200`, {
          credentials: 'include',
        });
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

  // ── Unique values for filter dropdowns ─────────────────────────────────
  const filterOptions = useMemo(() => {
    const statuses = new Set<string>();
    const providers = new Set<string>();
    const clubs = new Set<string>();
    for (const j of jobs) {
      statuses.add(j.status);
      if (j.provider) providers.add(j.provider);
      const club = j.club_name || j.project_name || '';
      if (club) clubs.add(club);
    }
    return {
      statuses: [...statuses].sort(),
      providers: [...providers].sort(),
      clubs: [...clubs].sort(),
    };
  }, [jobs]);

  // ── Filtered + sorted ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...jobs];

    if (statusFilter) list = list.filter((j) => j.status === statusFilter);
    if (typeFilter) list = list.filter((j) => j.output_type === typeFilter);
    if (providerFilter) list = list.filter((j) => j.provider === providerFilter);
    if (approvalFilter) {
      list = list.filter((j) => (j.approval_status || 'none') === approvalFilter);
    }
    if (clubFilter) {
      list = list.filter((j) => (j.club_name || j.project_name || '') === clubFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (j) =>
          j.label?.toLowerCase().includes(q) ||
          j.membership_name?.toLowerCase().includes(q) ||
          j.project_name?.toLowerCase().includes(q) ||
          j.model?.toLowerCase().includes(q),
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortCol === 'duration_seconds') {
        cmp = (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0);
      } else if (sortCol === 'provider') {
        cmp = (a.provider ?? '').localeCompare(b.provider ?? '');
      } else if (sortCol === 'status') {
        cmp = (a.status ?? '').localeCompare(b.status ?? '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [jobs, statusFilter, typeFilter, providerFilter, approvalFilter, clubFilter, searchQuery, sortCol, sortDir]);

  // ── Click handler for sortable headers ─────────────────────────────────
  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const sortIndicator = (col: typeof sortCol) =>
    sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) return <LoadingState message="Loading content…" />;
  if (error) return <div style={{ padding: 20, color: '#991b1b' }}>Error: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search label, member, model…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...selectStyle, minWidth: 180 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Status</option>
          {filterOptions.statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
          <option value="">All Types</option>
          <option value="image">🖼️ Image</option>
          <option value="video">🎬 Video</option>
        </select>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} style={selectStyle}>
          <option value="">All Providers</option>
          {filterOptions.providers.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
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
            {filterOptions.clubs.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {(statusFilter || typeFilter || providerFilter || approvalFilter || clubFilter || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
              setProviderFilter('');
              setApprovalFilter('');
              setClubFilter('');
              setSearchQuery('');
            }}
            style={actionButtonStyle('neutral')}
          >
            Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {filtered.length} / {jobs.length} items
        </span>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={compactThStyle}>Type</th>
                <th style={compactThStyle}>Label / Member</th>
                <th style={compactThStyle}>Club</th>
                <th style={compactThStyle}>Team</th>
                <th style={{ ...compactThStyle, cursor: 'pointer' }} onClick={() => toggleSort('provider')}>
                  Provider{sortIndicator('provider')}
                </th>
                <th style={compactThStyle}>Model</th>
                <th style={{ ...compactThStyle, cursor: 'pointer' }} onClick={() => toggleSort('status')}>
                  Status{sortIndicator('status')}
                </th>
                <th style={compactThStyle}>Approval</th>
                <th style={{ ...compactThStyle, cursor: 'pointer' }} onClick={() => toggleSort('created_at')}>
                  Created{sortIndicator('created_at')}
                </th>
                <th style={{ ...compactThStyle, cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('duration_seconds')}>
                  Duration{sortIndicator('duration_seconds')}
                </th>
                <th style={{ ...compactThStyle, textAlign: 'right' }}>Variants</th>
                <th style={compactThStyle}>Preview</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ ...compactTdStyle, textAlign: 'center', color: '#9ca3af', padding: 24 }}>
                    No content items found
                  </td>
                </tr>
              )}
              {filtered.map((job) => {
                const club = job.club_name || '';
                const team = job.project_name || '';
                return (
                  <tr key={job.task_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {/* Type */}
                    <td style={compactTdStyle}>
                      <span style={{ fontSize: 16, marginRight: 4 }}>
                        {job.output_type === 'image' ? '🖼️' : '🎬'}
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {job.output_asset_type || job.output_type}
                      </span>
                    </td>

                    {/* Label / Member */}
                    <td style={compactTextTdStyle}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{job.label || '—'}</div>
                      {job.membership_name && (
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{job.membership_name}</div>
                      )}
                    </td>

                    {/* Club */}
                    <td style={compactTextTdStyle}>{club || '—'}</td>

                    {/* Team */}
                    <td style={compactTextTdStyle}>{team || '—'}</td>

                    {/* Provider */}
                    <td style={{ ...compactTdStyle, fontWeight: 600 }}>{job.provider || '—'}</td>

                    {/* Model */}
                    <td style={compactTextTdStyle}>{job.model || '—'}</td>

                    {/* Status */}
                    <td style={compactTdStyle}>
                      <Pill text={job.status} colorMap={statusColors} />
                    </td>

                    {/* Approval */}
                    <td style={compactTdStyle}>
                      {job.approval_status ? (
                        <Pill text={job.approval_status} colorMap={approvalColors} />
                      ) : (
                        <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>
                      )}
                    </td>

                    {/* Created */}
                    <td style={compactTdStyle}>
                      <div style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(job.created_at)}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{formatTime(job.created_at)}</div>
                    </td>

                    {/* Duration */}
                    <td style={{ ...compactTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(job.duration_seconds)}
                    </td>

                    {/* Variants */}
                    <td style={{ ...compactTdStyle, textAlign: 'right' }}>
                      {job.variant_count ?? 0}
                    </td>

                    {/* Preview */}
                    <td style={compactTdStyle}>
                      {job.output_url ? (
                        <a
                          href={job.output_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ ...actionButtonStyle('primary'), textDecoration: 'none', fontSize: 11 }}
                        >
                          View
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
