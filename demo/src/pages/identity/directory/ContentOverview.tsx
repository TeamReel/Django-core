import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import { SkeletonList } from '@/components/Skeleton';
import co from './ContentOverview.module.css';
import { generativeApi } from '@/api';
import type { GenerationJob } from '@/hooks/useGenerationJobs';


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



// ── Component ────────────────────────────────────────────────────────────────

export const ContentOverview: React.FC = () => {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { results } = await generativeApi.listJobs({ limit: 200 });
        if (!cancelled) setJobs(results as unknown as GenerationJob[]);
      } catch (e) {
        logger.error('Failed to load', e);
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
    const totalInputTokens = jobs.reduce((s, j) => s + (j.estimated_input_tokens ?? 0), 0);
    const totalOutputTokens = jobs.reduce((s, j) => s + (j.estimated_output_tokens ?? 0), 0);

    const completedWithDur = jobs.filter((j) => j.status === 'completed' && j.duration_seconds != null);
    const avgGenTime = completedWithDur.length
      ? completedWithDur.reduce((s, j) => s + (j.duration_seconds ?? 0), 0) / completedWithDur.length
      : null;
    const pendingReview = jobs.filter((j) => j.approval_status === 'pending_review').length;

    // ── By provider ──────────────────────────────────────────────────
    type ProvRow = { count: number; models: Set<string>; images: number; videos: number; totalDur: number; durN: number; cost: number; inTok: number; outTok: number };
    const provMap: Record<string, ProvRow> = {};
    for (const j of jobs) {
      const p = j.provider || 'unknown';
      if (!provMap[p]) provMap[p] = { count: 0, models: new Set(), images: 0, videos: 0, totalDur: 0, durN: 0, cost: 0, inTok: 0, outTok: 0 };
      provMap[p].count++;
      if (j.model) provMap[p].models.add(j.model);
      if (j.output_type === 'image') provMap[p].images++;
      if (j.output_type === 'video') provMap[p].videos++;
      if (j.duration_seconds != null) { provMap[p].totalDur += j.duration_seconds; provMap[p].durN++; }
      provMap[p].cost += j.estimated_cost_eur ?? 0;
      provMap[p].inTok += j.estimated_input_tokens ?? 0;
      provMap[p].outTok += j.estimated_output_tokens ?? 0;
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
      summary: { total, images, videos, variants, totalCost, totalInputTokens, totalOutputTokens, avgGenTime, pendingReview },
      byProvider,
      byClub,
      byStatus,
      byApproval,
    };
  }, [jobs]);

  if (loading) return <SkeletonList count={3} variant="card" />;
  if (error) return <div className="p-20 text-error">Error: {error}</div>;

  return (
    <div className="flex-col gap-16">

      {/* ── Summary table ─────────────────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="dir-th">Metric</th>
                <th className="dir-th text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="dir-td">Total Content Items</td><td className="dir-td text-right tabular-nums">{summary.total}</td></tr>
              <tr><td className="dir-td">🖼️ AI Images</td><td className="dir-td text-right tabular-nums">{summary.images}</td></tr>
              <tr><td className="dir-td">🎬 AI Videos</td><td className="dir-td text-right tabular-nums">{summary.videos}</td></tr>
              <tr><td className="dir-td">Total Variants</td><td className="dir-td text-right tabular-nums">{summary.variants}</td></tr>
              <tr><td className="dir-td">Avg. Generation Time</td><td className="dir-td text-right tabular-nums">{fmtDur(summary.avgGenTime)}</td></tr>
              <tr><td className="dir-td">Est. Input Tokens</td><td className="dir-td text-right tabular-nums">{summary.totalInputTokens > 0 ? summary.totalInputTokens.toLocaleString('nl-NL') : '—'}</td></tr>
              <tr><td className="dir-td">Est. Output Tokens</td><td className="dir-td text-right tabular-nums">{summary.totalOutputTokens > 0 ? summary.totalOutputTokens.toLocaleString('nl-NL') : '—'}</td></tr>
              <tr><td className="dir-td">Pending Review</td><td className="dir-td text-right tabular-nums">{summary.pendingReview}</td></tr>
              <tr><td className="dir-td fw-600">Est. Total Cost</td><td className="dir-td text-right tabular-nums fw-600">{fmtCost(summary.totalCost)}</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Status / Approval side-by-side ────────────────────────────── */}
      <div className="flex-row gap-16 flex-wrap">
        <Card className={co.flexPanel}>
          <div className="overflow-x-auto">
            <table className="dir-table">
              <thead><tr><th className="dir-th">Job Status</th><th className="dir-th text-right">Count</th></tr></thead>
              <tbody>
                {byStatus.map(([s, c]) => (
                  <tr key={s}><td className="dir-td">{s.replace(/_/g, ' ')}</td><td className="dir-td text-right tabular-nums">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className={co.flexPanel}>
          <div className="overflow-x-auto">
            <table className="dir-table">
              <thead><tr><th className="dir-th">Approval Status</th><th className="dir-th text-right">Count</th></tr></thead>
              <tbody>
                {byApproval.map(([s, c]) => (
                  <tr key={s}><td className="dir-td">{s.replace(/_/g, ' ')}</td><td className="dir-td text-right tabular-nums">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Providers & Models ────────────────────────────────────────── */}
      <Card>
        <div className="overflow-x-auto">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="dir-th">Provider</th>
                <th className="dir-th">Model</th>
                <th className="dir-th text-right">Total</th>
                <th className="dir-th text-right">Images</th>
                <th className="dir-th text-right">Videos</th>
                <th className="dir-th text-right">Avg Gen. Time</th>
                <th className="dir-th text-right">Tokens (in/out)</th>
                <th className="dir-th text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {byProvider.map(([prov, d]) => (
                <tr key={prov}>
                  <td className="dir-td fw-600">{prov}</td>
                  <td className="dir-td">{[...d.models].join(', ') || '—'}</td>
                  <td className="dir-td text-right tabular-nums">{d.count}</td>
                  <td className="dir-td text-right tabular-nums">{d.images}</td>
                  <td className="dir-td text-right tabular-nums">{d.videos}</td>
                  <td className="dir-td text-right tabular-nums">{d.durN > 0 ? fmtDur(d.totalDur / d.durN) : '—'}</td>
                  <td className="dir-td text-right tabular-nums fs-11">{d.inTok > 0 || d.outTok > 0 ? `${(d.inTok / 1000).toFixed(1)}k / ${(d.outTok / 1000).toFixed(1)}k` : '—'}</td>
                  <td className="dir-td text-right tabular-nums">{fmtCost(d.cost)}</td>
                </tr>
              ))}
              {/* Totals row */}
              {byProvider.length > 1 && (
                <tr className={`fw-600 ${co.totalRow}`}>
                  <td className="dir-td">Total</td>
                  <td className="dir-td"></td>
                  <td className="dir-td text-right tabular-nums">{summary.total}</td>
                  <td className="dir-td text-right tabular-nums">{summary.images}</td>
                  <td className="dir-td text-right tabular-nums">{summary.videos}</td>
                  <td className="dir-td text-right tabular-nums">{fmtDur(summary.avgGenTime)}</td>
                  <td className="dir-td text-right tabular-nums fs-11">{summary.totalInputTokens > 0 || summary.totalOutputTokens > 0 ? `${(summary.totalInputTokens / 1000).toFixed(1)}k / ${(summary.totalOutputTokens / 1000).toFixed(1)}k` : '—'}</td>
                  <td className="dir-td text-right tabular-nums">{fmtCost(summary.totalCost)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Per Club / Team ───────────────────────────────────────────── */}
      {byClub.length > 1 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="dir-table">
              <thead>
                <tr>
                  <th className="dir-th">Club / Team</th>
                  <th className="dir-th text-right">Total</th>
                  <th className="dir-th text-right">Images</th>
                  <th className="dir-th text-right">Videos</th>
                  <th className="dir-th text-right">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {byClub.map(([club, d]) => (
                  <tr key={club}>
                    <td className="dir-td fw-500">{club}</td>
                    <td className="dir-td text-right tabular-nums">{d.count}</td>
                    <td className="dir-td text-right tabular-nums">{d.images}</td>
                    <td className="dir-td text-right tabular-nums">{d.videos}</td>
                    <td className="dir-td text-right tabular-nums">{fmtCost(d.cost)}</td>
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
