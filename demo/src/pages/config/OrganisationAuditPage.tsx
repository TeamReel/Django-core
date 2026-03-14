import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { PageContent, PageHeader } from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import type { AuditEvent } from '../../types';
import { api, ApiError } from '@/api';
import { unwrapEnvelope as unwrap, extractList } from '../../utils/apiEnvelope';

export const OrganisationAuditPage: React.FC = () => {
  const { user } = useAuth();
  const { context } = useContextSwitcher();

  const organisationId = String(context?.organisation?.id || '').trim();
  const organisationName = String(context?.organisation?.name || (context?.organisation as unknown as Record<string, unknown>)?.title || '').trim();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const userProjects: Record<string, unknown>[] = Array.isArray(user?.projects) ? user.projects : [];
    for (const p of userProjects) {
      const id = String(p?.id || '').trim();
      const slug = String(p?.slug || '').trim();
      const key = String(p?.key || '').trim();
      const label = String(p?.name || p?.title || p?.label || p?.slug || p?.id || '').trim();
      if (!label) continue;
      if (id) map.set(id, label);
      if (slug) map.set(slug, label);
      if (key) map.set(key, label);
    }
    return map;
  }, [user]);

  useEffect(() => {
    if (!organisationId) return;

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('limit', '200');
        params.set('offset', '0');
        // Backend expects this key (used by AuditLogPage as well)
        params.set('organization', organisationId);

        const raw = await api.get<Record<string, unknown>>(`/activity/?${params.toString()}`);
        const data = unwrap<Record<string, unknown>>(raw);
        const list = extractList(data);
        const next = (list as AuditEvent[]).sort((a, b) => String(b?.timestamp || '').localeCompare(String(a?.timestamp || '')));

        if (!cancelled) setEvents(next);
      } catch (e) {
        logger.error('Failed to load organisation audit', e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load organisation audit');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  return (
    <>
      <PageHeader
        title={organisationName ? `Organisation Audit • ${organisationName}` : 'Organisation Audit'}
        subtitle="Audit events scoped to your current organisation context."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Organisation' }, { label: 'Audit' }]}
      />

      <PageContent>
        {!organisationId && (
          <Alert variant="warning">Select an organisation context to view organisation audit.</Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          {loading ? (
            <div className="text-sm text-gray-600">Loading audit events…</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-gray-600">No audit events found for this organisation.</div>
          ) : (
            <Table
              columns={[
                { key: 'timestamp', label: 'When' },
                { key: 'event_type', label: 'Event' },
                { key: 'user', label: 'User' },
                { key: 'project', label: 'Project' },
              ]}
              rows={events.map((row) => {
                let when: string = '—';
                try {
                  when = new Date(String(row.timestamp)).toLocaleString('nl-NL');
                } catch {
                  when = String(row.timestamp || '—');
                }

                const userLabel = String(row?.user?.name || row?.user?.email || row?.user?.id || '—');
                const projectKey = String(row?.project_id || '').trim();
                const projectLabel = projectKey ? (projectLabelByKey.get(projectKey) || projectKey) : '—';

                return {
                  timestamp: when,
                  event_type: String(row?.event_type || '—'),
                  user: userLabel,
                  project: projectLabel,
                };
              })}
            />
          )}
        </Card>
      </PageContent>
    </>
  );
};
export default OrganisationAuditPage;
