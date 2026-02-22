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

function fmtDur(s: number | null | undefined): string {
  if (s == null) return '—';
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function fmtCost(eur: number | null | undefined): string {
  if (eur == null) return '—';
  return `€${eur.toFixed(eur < 0.01 ? 4 : 2)}`;
}

const rightTd: React.CSSProperties = { ...compactTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const rightTh: React.CSSProperties = { ...compactThStyle, textAlign: 'right' };

// ── Component ────────────────────────────────────────────────────────────────

export const ContentOverview: React.FC = () => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // ── Compute all stats ──────────────────────────────────────────────────

  const { summary, byProvider, byClub, byStatus, byApproval } = useMemo(() => {
    const total = jobs.length;
    const images = jobs.filter((j) => j.output_type === 'image').length;
    const videos = jobs.filter((j) => j.output_type === 'video').length;
    const variants = jobs.reduce((s, j) => s + (j.variant_count ?? 0), 0);
    const totalCost = jobs.reduce((s, j) => s + (j.estimated_cost_eur ?? 0), 0);

    const completedWithDur = jobs.filter((j) => j.status === 'completed' && j.duration_seconds != null);
    const avgGenTime = completedWithDur.length
      ? completedWithDur.reduce((s, j) => s + (j.duration_seconds ?? 0), 0) / completedWithDur.length
      : null;
    const pendingReview = jobs.filter((j) => j.approval_status === 'pending_review').length;

    // ── By provider ──────────────────────────────────────────────────
    type ProvRow = { count: number; models: Set<string>; images: number; videos: number; totalDur: number; durN: number; cost: number };
    const provMap: Record<string, ProvRow> = {};
    for (const j of jobs) {
      const p = j.provider || 'unknown';
      if (!provMap[p]) provMap[p] = { count: 0, models: new Set(), images: 0, videos: 0, totalDur: 0, durN: 0, cost: 0 };
      provMap[p].count++;
      if (j.model) provMap[p].models.add(j.model);
      if (j.output_type === 'image') provMap[p].images++;
      if (j.output_type === 'video') provMap[p].videos++;
      if (j.duration_seconds != null) { provMap[p].totalDur += j.duration_seconds; provMap[p].durN++; }
      provMap[p].cost += j.estimated_cost_eur ?? 0;
    }
    const byProvider = Object.entries(provMap).sort((a, b) => b[1].count - a[1].count);

    // ── By club ──────────────────────────────────────────────────────
    type ClubRow = { count: number; images: number; videos: number; cost: number };
    const clubMap: Record<string, ClubRow> = {};
    for (const j of jobs) {
      const c = j.club_name || j.project_name || 'Unknown';
      if (!clubMap[c]) clubMap[c] = { count: 0, images: 0, videos: 0, cost: 0 };
      clubMap[c].count++;
      if (j.output_type === 'image') clubMap[c].images++;
      if (j.output_type === 'video') clubMap[c].videos++;
      clubMap[c].cost += j.estimated_cost_eur ?? 0;
    }
    const byClub = Object.entries(clubMap).sort((a, b) => b[1].count - a[1].count);

    // ── By status ────────────────────────────────────────────────────
    const statusMap: Record<string, number> = {};
    for (const j of jobs) statusMap[j.status] = (statusMap[j.status] ?? 0) + 1;
    const byStatus = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);

    // ── By approval ──────────────────────────────────────────────────
    const apprMap: Record<string, number> = {};
    for (const j of jobs) { const a = j.approval_status || 'none'; apprMap[a] = (apprMap[a] ?? 0) + 1; }
    const byApproval = Object.entries(apprMap).sort((a, b) => b[1] - a[1]);

    return {
      summary: { total, images, videos, variants, totalCost, avgGenTime, pendingReview },
      byProvider,
      byClub,
      byStatus,
      byApproval,
    };
  }, [jobs]);

  if (loading) return <LoadingState message="Loading content overview…" />;
  if (error) return <div style={{ padding: 20, color: '#991b1b' }}>Error: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Summary table ─────────────────────────────────────────────── */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={compactThStyle}>Metric</th>
                <th style={rightTh}>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={compactTdStyle}>Total Content Items</td><td style={rightTd}>{summary.total}</td></tr>
              <tr><td style={compactTdStyle}>🖼️ AI Images</td><td style={rightTd}>{summary.images}</td></tr>
              <tr><td style={compactTdStyle}>🎬 AI Videos</td><td style={rightTd}>{summary.videos}</td></tr>
              <tr><td style={compactTdStyle}>Total Variants</td><td style={rightTd}>{summary.variants}</td></tr>
              <tr><td style={compactTdStyle}>Avg. Generation Time</td><td style={rightTd}>{fmtDur(summary.avgGenTime)}</td></tr>
              <tr><td style={compactTdStyle}>Pending Review</td><td style={rightTd}>{summary.pendingReview}</td></tr>
              <tr><td style={{ ...compactTdStyle, fontWeight: 600 }}>Est. Total Cost</td><td style={{ ...rightTd, fontWeight: 600 }}>{fmtCost(summary.totalCost)}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Status / Approval side-by-side ────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card style={{ flex: '1 1 300px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={compactTableStyle}>
              <thead><tr><th style={compactThStyle}>Job Status</th><th style={rightTh}>Count</th></tr></thead>
              <tbody>
                {byStatus.map(([s, c]) => (
                  <tr key={s}><td style={compactTdStyle}>{s.replace(/_/g, ' ')}</td><td style={rightTd}>{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card style={{ flex: '1 1 300px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={compactTableStyle}>
              <thead><tr><th style={compactThStyle}>Approval Status</th><th style={rightTh}>Count</th></tr></thead>
              <tbody>
                {byApproval.map(([s, c]) => (
                  <tr key={s}><td style={compactTdStyle}>{s.replace(/_/g, ' ')}</td><td style={rightTd}>{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Providers & Models ────────────────────────────────────────── */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={compactTableStyle}>
            <thead>
              <tr>
                <th style={compactThStyle}>Provider</th>
                <th style={compactThStyle}>Model</th>
                <th style={rightTh}>Total</th>
                <th style={rightTh}>Images</th>
                <th style={rightTh}>Videos</th>
                <th style={rightTh}>Avg Gen. Time</th>
                <th style={rightTh}>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {byProvider.map(([prov, d]) => (
                <tr key={prov}>
                  <td style={{ ...compactTdStyle, fontWeight: 600 }}>{prov}</td>
                  <td style={compactTdStyle}>{[...d.models].join(', ') || '—'}</td>
                  <td style={rightTd}>{d.count}</td>
                  <td style={rightTd}>{d.images}</td>
                  <td style={rightTd}>{d.videos}</td>
                  <td style={rightTd}>{d.durN > 0 ? fmtDur(d.totalDur / d.durN) : '—'}</td>
                  <td style={rightTd}>{fmtCost(d.cost)}</td>
                </tr>
              ))}
              {/* Totals row */}
              {byProvider.length > 1 && (
                <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 600 }}>
                  <td style={compactTdStyle}>Total</td>
                  <td style={compactTdStyle}></td>
                  <td style={rightTd}>{summary.total}</td>
                  <td style={rightTd}>{summary.images}</td>
                  <td style={rightTd}>{summary.videos}</td>
                  <td style={rightTd}>{fmtDur(summary.avgGenTime)}</td>
                  <td style={rightTd}>{fmtCost(summary.totalCost)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Per Club / Team ───────────────────────────────────────────── */}
      {byClub.length > 1 && (
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Club / Team</th>
                  <th style={rightTh}>Total</th>
                  <th style={rightTh}>Images</th>
                  <th style={rightTh}>Videos</th>
                  <th style={rightTh}>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {byClub.map(([club, d]) => (
                  <tr key={club}>
                    <td style={{ ...compactTdStyle, fontWeight: 500 }}>{club}</td>
                    <td style={rightTd}>{d.count}</td>
                    <td style={rightTd}>{d.images}</td>
                    <td style={rightTd}>{d.videos}</td>
                    <td style={rightTd}>{fmtCost(d.cost)}</td>
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
