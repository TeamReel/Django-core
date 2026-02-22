import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@django-core/design-system';
import LoadingState from '../../../components/LoadingState';
import { getApiBaseUrl } from '../../../utils/apiBase';
import type { GenerationJob } from '../../../hooks/useGenerationJobs';
import {
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
} from '../../../utils/directoryStyles';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/** Colour-coded pill for status values. */
function StatusBadge({ status, count }: { status: string; count: number }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    completed: { bg: '#dcfce7', fg: '#166534' },
    processing: { bg: '#dbeafe', fg: '#1e40af' },
    queued: { bg: '#fef9c3', fg: '#854d0e' },
    waiting: { bg: '#fef9c3', fg: '#854d0e' },
    failed: { bg: '#fde2e2', fg: '#991b1b' },
    cancelled: { bg: '#f3f4f6', fg: '#6b7280' },
    pending_review: { bg: '#fef3c7', fg: '#92400e' },
    approved: { bg: '#dcfce7', fg: '#166534' },
    rejected: { bg: '#fde2e2', fg: '#991b1b' },
  };
  const c = colors[status] ?? { bg: '#f3f4f6', fg: '#374151' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 10px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
      }}
    >
      {status.replace(/_/g, ' ')} <span style={{ fontWeight: 700 }}>{count}</span>
    </span>
  );
}

// ── Stat card used for top-level KPIs ────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div
      style={{
        flex: '1 1 180px',
        padding: '16px 20px',
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export const ContentOverview: React.FC = () => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // ── Derived stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = jobs.length;
    const images = jobs.filter((j) => j.output_type === 'image');
    const videos = jobs.filter((j) => j.output_type === 'video');

    // By status
    const byStatus: Record<string, number> = {};
    for (const j of jobs) {
      byStatus[j.status] = (byStatus[j.status] ?? 0) + 1;
    }

    // By approval status
    const byApproval: Record<string, number> = {};
    for (const j of jobs) {
      const a = j.approval_status || 'none';
      byApproval[a] = (byApproval[a] ?? 0) + 1;
    }

    // By provider
    const byProvider: Record<string, { count: number; models: Set<string>; totalDur: number; durCount: number; images: number; videos: number }> = {};
    for (const j of jobs) {
      const prov = j.provider || 'unknown';
      if (!byProvider[prov]) {
        byProvider[prov] = { count: 0, models: new Set(), totalDur: 0, durCount: 0, images: 0, videos: 0 };
      }
      byProvider[prov].count++;
      if (j.model) byProvider[prov].models.add(j.model);
      if (j.duration_seconds != null) {
        byProvider[prov].totalDur += j.duration_seconds;
        byProvider[prov].durCount++;
      }
      if (j.output_type === 'image') byProvider[prov].images++;
      if (j.output_type === 'video') byProvider[prov].videos++;
    }

    // By club
    const byClub: Record<string, { count: number; images: number; videos: number }> = {};
    for (const j of jobs) {
      const club = j.club_name || j.project_name || 'Unknown';
      if (!byClub[club]) byClub[club] = { count: 0, images: 0, videos: 0 };
      byClub[club].count++;
      if (j.output_type === 'image') byClub[club].images++;
      if (j.output_type === 'video') byClub[club].videos++;
    }

    // Total variants produced
    const totalVariants = jobs.reduce((acc, j) => acc + (j.variant_count ?? 0), 0);

    // Average duration (completed jobs only)
    const completedWithDur = jobs.filter((j) => j.status === 'completed' && j.duration_seconds != null);
    const avgDuration = completedWithDur.length
      ? completedWithDur.reduce((s, j) => s + (j.duration_seconds ?? 0), 0) / completedWithDur.length
      : null;

    return {
      total,
      images: images.length,
      videos: videos.length,
      byStatus,
      byApproval,
      byProvider,
      byClub,
      totalVariants,
      avgDuration,
      pendingReview: byApproval['pending_review'] ?? 0,
    };
  }, [jobs]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading content overview…" />;
  if (error) return <div style={{ padding: 20, color: '#991b1b' }}>Error: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top KPI cards ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="📦" label="Total Content Items" value={stats.total} />
        <StatCard
          icon="🖼️"
          label="AI Images"
          value={stats.images}
          sub={stats.totalVariants > 0 ? `${stats.totalVariants} variants total` : undefined}
        />
        <StatCard icon="🎬" label="AI Videos" value={stats.videos} />
        <StatCard
          icon="⏱️"
          label="Avg. Generation Time"
          value={formatDuration(stats.avgDuration)}
          sub={stats.pendingReview > 0 ? `${stats.pendingReview} pending review` : undefined}
        />
      </div>

      {/* ── Status & Approval badges ──────────────────────────────────── */}
      <Card>
        <div style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>Job Status</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(stats.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([s, c]) => (
                <StatusBadge key={s} status={s} count={c} />
              ))}
          </div>

          <h3 style={{ margin: '16px 0 10px', fontSize: 14, fontWeight: 600 }}>Approval Status</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(stats.byApproval)
              .sort((a, b) => b[1] - a[1])
              .map(([s, c]) => (
                <StatusBadge key={s} status={s} count={c} />
              ))}
          </div>
        </div>
      </Card>

      {/* ── Provider / Model breakdown ────────────────────────────────── */}
      <Card>
        <div style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>AI Providers & Models</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Provider</th>
                  <th style={compactThStyle}>Model</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Total</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Images</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Videos</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byProvider)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([prov, d]) => (
                    <tr key={prov}>
                      <td style={{ ...compactTdStyle, fontWeight: 600 }}>{prov}</td>
                      <td style={compactTdStyle}>{[...d.models].join(', ') || '—'}</td>
                      <td style={{ ...compactTdStyle, textAlign: 'right' }}>{d.count}</td>
                      <td style={{ ...compactTdStyle, textAlign: 'right' }}>{d.images}</td>
                      <td style={{ ...compactTdStyle, textAlign: 'right' }}>{d.videos}</td>
                      <td style={{ ...compactTdStyle, textAlign: 'right' }}>
                        {d.durCount > 0 ? formatDuration(d.totalDur / d.durCount) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* ── Per-Club breakdown ─────────────────────────────────────────── */}
      {Object.keys(stats.byClub).length > 1 && (
        <Card>
          <div style={{ padding: 16 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>Content by Club / Team</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Club / Team</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Total</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Images</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Videos</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.byClub)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([club, d]) => (
                      <tr key={club}>
                        <td style={{ ...compactTdStyle, fontWeight: 500 }}>{club}</td>
                        <td style={{ ...compactTdStyle, textAlign: 'right' }}>{d.count}</td>
                        <td style={{ ...compactTdStyle, textAlign: 'right' }}>{d.images}</td>
                        <td style={{ ...compactTdStyle, textAlign: 'right' }}>{d.videos}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
