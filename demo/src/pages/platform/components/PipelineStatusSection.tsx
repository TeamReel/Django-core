import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, Badge } from '@django-core/design-system';
import Skeleton from '@/components/Skeleton';
import type { AiStats, ContentStats, VideoStats } from '../platformStatsTypes';
import styles from '../PlatformStatsPage.module.css';

interface PipelineStatusSectionProps {
  ai?: AiStats;
  content?: ContentStats;
  video?: VideoStats;
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--color-green-500, #22c55e)',
  pending: 'var(--color-amber-400, #fbbf24)',
  processing: 'var(--color-accent-500, #3b82f6)',
  failed: 'var(--color-red-500, #ef4444)',
  draft: 'var(--color-slate-400, #94a3b8)',
  approved: 'var(--color-green-500, #22c55e)',
  rejected: 'var(--color-red-500, #ef4444)',
};

function toChartData(obj: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

const MiniDonut: React.FC<{ data: { name: string; value: number }[]; title: string }> = ({ data, title }) => {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className={styles.miniChart}>
        <h4 className={styles.miniChartTitle}>{title}</h4>
        <div className={styles.emptyState}>Geen data</div>
      </div>
    );
  }

  return (
    <div className={styles.miniChart}>
      <h4 className={styles.miniChartTitle}>{title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={STATUS_COLORS[entry.name] ?? 'var(--color-slate-400, #94a3b8)'}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PipelineStatusSection: React.FC<PipelineStatusSectionProps> = ({
  ai,
  content,
  video,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className={styles.pipelineGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" width="100%" height="280px" />
        ))}
      </div>
    );
  }

  return (
    <Card className={styles.chartCard}>
      <h3 className={styles.sectionTitle}>Pipeline Status</h3>

      <div className={styles.pipelineGrid}>
        {/* AI */}
        <div className={styles.pipelineColumn}>
          <MiniDonut data={toChartData(ai?.requests_by_status ?? {})} title="AI Requests" />
          {ai && (
            <div className={styles.pipelineStats}>
              <div>Outputs: <strong>{ai.total_outputs}</strong></div>
              <div>Gem. verwerking: <strong>{ai.avg_processing_seconds.toFixed(1)}s</strong></div>
            </div>
          )}
          {ai && Object.keys(ai.requests_by_provider).length > 0 && (
            <div className={styles.miniBarWrap}>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={toChartData(ai.requests_by_provider)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-accent-500, #3b82f6)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={styles.pipelineColumn}>
          <MiniDonut data={toChartData(content?.items_by_status ?? {})} title="Content Items" />
          {content && (
            <div className={styles.pipelineStats}>
              <div>Actieve templates: <strong>{content.templates_active}</strong></div>
              <div>Goedkeuringspercentage: <strong>{content.approval_rate.toFixed(1)}%</strong></div>
              {content.pending_approvals > 0 && (
                <div>
                  Wachtend: <Badge variant="warning">{content.pending_approvals}</Badge>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video */}
        <div className={styles.pipelineColumn}>
          <MiniDonut data={toChartData(video?.jobs_by_status ?? {})} title="Video Jobs" />
          {video && Object.keys(video.jobs_by_type).length > 0 && (
            <div className={styles.miniBarWrap}>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={toChartData(video.jobs_by_type)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--color-violet-500, #8b5cf6)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
