import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Badge,
  Alert,
  Button,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getErrorMessage } from '../../utils/errorHelpers';
import styles from './RoutingRulesPage.module.css';

interface RoutingRule {
  id: number;
  event_type: string;
  scope: 'global' | 'org' | 'project';
  organisation: string | null;
  organisation_name?: string;
  project: number | null;
  project_name?: string;
  target_role: string | null;
  channel: 'in_app' | 'email' | 'push';
  priority: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const priorityLabel: Record<number, string> = {
  0: 'Low',
  1: 'Normal',
  2: 'High',
  3: 'Urgent',
};

export const RoutingRulesPage: React.FC = () => {
  const { context, organisations } = useContextSwitcher();
  const { user } = useAuth();

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';

  const isSystemAdmin = Boolean(user?.is_superuser) || String(user?.role || '').toLowerCase() === 'superadmin';

  const {
    organisationOptions,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
    if (option.id === '' || option.label === 'Global') {
      localStorage.removeItem('django-core:currentOrgId');
      localStorage.removeItem('django-core:currentProjectId');
    } else {
      localStorage.setItem('django-core:currentOrgId', option.id);
      localStorage.removeItem('django-core:currentProjectId');
    }
    window.location.reload();
  };

  const apiBaseUrl = getApiBaseUrl();

  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createDraft, setCreateDraft] = useState({
    event_type: 'match.created',
    channel: 'in_app' as RoutingRule['channel'],
    target_role: 'org_admin',
    priority: 1,
    enabled: true,
  });
  const [creating, setCreating] = useState(false);

  async function fetchRules() {
    try {
      setLoading(true);
      setError(null);

      if (!currentOrgId && !isSystemAdmin) {
        setRules([]);
        setError('Select an organisation to manage routing rules.');
        return;
      }

      const url = currentOrgId
        ? `${apiBaseUrl}/api/v1/contextual-notifications/routing-rules/?org_id=${encodeURIComponent(currentOrgId)}`
        : `${apiBaseUrl}/api/v1/contextual-notifications/routing-rules/`;

      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg = (payload && (payload.detail || payload.error)) || `Failed to load routing rules (HTTP ${res.status})`;
        throw new Error(msg);
      }

      const data = await res.json().catch(() => null);
      const rawResults: RoutingRule[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : Array.isArray(data?.data?.results) ? data.data.results : [];

      setRules(rawResults as RoutingRule[]);
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e) || 'Failed to load');
      setRules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgId]);

  async function createRule() {
    if (!currentOrgId) {
      setError('Select an organisation first.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const res = await fetch(`${apiBaseUrl}/api/v1/contextual-notifications/routing-rules/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_type: createDraft.event_type,
          scope: 'org',
          organisation: currentOrgId,
          project: null,
          target_role: createDraft.target_role || null,
          channel: createDraft.channel,
          priority: Number(createDraft.priority),
          enabled: Boolean(createDraft.enabled),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg = (payload && (payload.detail || payload.error)) || `Failed to create rule (HTTP ${res.status})`;
        throw new Error(msg);
      }

      await fetchRules();
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e) || 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function toggleRule(rule: RoutingRule) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/contextual-notifications/routing-rules/${rule.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !rule.enabled }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg = (payload && (payload.detail || payload.error)) || `Failed to update rule (HTTP ${res.status})`;
        throw new Error(msg);
      }

      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e) || 'Failed to update');
    }
  }

  async function deleteRule(rule: RoutingRule) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/contextual-notifications/routing-rules/${rule.id}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok && res.status !== 204) {
        const payload = await res.json().catch(() => null);
        const msg = (payload && (payload.detail || payload.error)) || `Failed to delete rule (HTTP ${res.status})`;
        throw new Error(msg);
      }

      setRules(prev => prev.filter(r => r.id !== rule.id));
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e) || 'Failed to delete');
    }
  }

  return (
    <>
      <PageHeader
        title="Routing Rules"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Governance' },
          {
            label: (
              <BreadcrumbContextSwitcher
                currentId={currentOrgId || ''}
                options={organisationOptions}
                onSelect={handleOrganisationSwitch}
                hasDropdown={true}
                type="organisation"
              />
            ),
          },
          { label: 'Routing Rules' },
        ]}
        actions={
          <div className="flex-row gap-12">
            <Button variant="secondary" size="sm" onClick={fetchRules} disabled={loading}>
              Refresh
            </Button>
            <a href="/routing-logs" className={`text-link fs-13 ${styles.routingLogsLink}`}>
              View routing logs
            </a>
          </div>
        }
      />

      <PageContent>
        <div className="grid gap-16">
          <Card>
            <div className="p-16">
              <div className="flex-between gap-12 flex-wrap">
                <div>
                  <h3 className="m-0 text-primary">Organisation</h3>
                  <div className={`fs-13 ${styles.orgInfo}`}>
                    {currentOrgId ? `${currentOrgName} (${currentOrgId})` : 'No organisation selected'}
                  </div>
                </div>
              </div>

              {error && <div className="mt-12"><Alert variant="error">{error}</Alert></div>}
            </div>
          </Card>

          <Card>
            <div className="p-16">
              <h3 className="m-0 mb-12 text-primary">Add org rule</h3>
              <div className={`grid gap-10 ${styles.formGrid}`}>
                <label className="grid gap-6 fs-13 text-primary">
                  Event type
                  <input
                    value={createDraft.event_type}
                    onChange={(e) => setCreateDraft({ ...createDraft, event_type: e.target.value })}
                    className={`rounded-6 border bg-surface text-primary ${styles.formInput}`}
                  />
                </label>

                <label className="grid gap-6 fs-13 text-primary">
                  Channel
                  <select
                    value={createDraft.channel}
                    onChange={(e) => setCreateDraft({ ...createDraft, channel: e.target.value as any })}
                    className={`rounded-6 border bg-surface text-primary ${styles.formInput}`}
                  >
                    <option value="in_app">In-app</option>
                    <option value="email">Email</option>
                    <option value="push">Push</option>
                  </select>
                </label>

                <label className="grid gap-6 fs-13 text-primary">
                  Target role (optional)
                  <input
                    value={createDraft.target_role}
                    onChange={(e) => setCreateDraft({ ...createDraft, target_role: e.target.value })}
                    placeholder="org_admin"
                    className={`rounded-6 border bg-surface text-primary ${styles.formInput}`}
                  />
                </label>

                <label className="grid gap-6 fs-13 text-primary">
                  Priority
                  <select
                    value={String(createDraft.priority)}
                    onChange={(e) => setCreateDraft({ ...createDraft, priority: Number(e.target.value) })}
                    className={`rounded-6 border bg-surface text-primary ${styles.formInput}`}
                  >
                    <option value="0">Low</option>
                    <option value="1">Normal</option>
                    <option value="2">High</option>
                    <option value="3">Urgent</option>
                  </select>
                </label>

                <label className={`flex-row gap-8 fs-13 text-primary ${styles.enabledLabel}`}>
                  <input
                    type="checkbox"
                    checked={createDraft.enabled}
                    onChange={(e) => setCreateDraft({ ...createDraft, enabled: e.target.checked })}
                  />
                  Enabled
                </label>
              </div>

              <div className="mt-12">
                <Button onClick={createRule} disabled={creating || !currentOrgId}>
                  {creating ? 'Creating…' : 'Create rule'}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-16">
              <h3 className="m-0 mb-12 text-primary">Rules</h3>

              {loading ? (
                <div className={styles.emptyState}>Loading…</div>
              ) : rules.length === 0 ? (
                <div className={styles.emptyState}>No rules found.</div>
              ) : (
                <div className="grid gap-10">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="border rounded-8 p-12 bg-surface-2 flex-between gap-12 flex-wrap"
                    >
                      <div>
                        <div className="flex-row gap-8 flex-wrap">
                          <span className="fw-600 text-primary">{rule.event_type}</span>
                          <Badge size="sm" variant={rule.enabled ? 'success' : 'warning'}>
                            {rule.enabled ? 'ENABLED' : 'DISABLED'}
                          </Badge>
                          <Badge size="sm" variant="info">{rule.channel.toUpperCase()}</Badge>
                          <Badge size="sm" variant="default">{priorityLabel[rule.priority] || String(rule.priority)}</Badge>
                        </div>
                        <div className={styles.ruleDetails}>
                          scope={rule.scope} · role={rule.target_role || '—'}
                        </div>
                      </div>

                      <div className="flex-row gap-10">
                        <Button size="sm" variant="secondary" onClick={() => toggleRule(rule)}>
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteRule(rule)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </PageContent>
    </>
  );
};

export default RoutingRulesPage;
