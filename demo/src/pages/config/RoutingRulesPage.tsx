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

  const isSystemAdmin = Boolean((user as any)?.is_superuser) || String((user as any)?.role || '').toLowerCase() === 'superadmin';

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

  const apiBaseUrl = useMemo(() => String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, ''), []);

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
      const rawResults: any[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : Array.isArray(data?.data?.results) ? data.data.results : [];

      setRules(rawResults as RoutingRule[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
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
    } catch (e: any) {
      setError(e?.message || 'Failed to create');
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
    } catch (e: any) {
      setError(e?.message || 'Failed to update');
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
    } catch (e: any) {
      setError(e?.message || 'Failed to delete');
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
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button variant="secondary" size="sm" onClick={fetchRules} disabled={loading}>
              Refresh
            </Button>
            <a href="/routing-logs" style={{ color: 'var(--app-link)', textDecoration: 'none', fontSize: 13 }}>
              View routing logs
            </a>
          </div>
        }
      />

      <PageContent>
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--app-text)' }}>Organisation</h3>
                  <div style={{ marginTop: 6, color: 'var(--app-text-muted)', fontSize: 13 }}>
                    {currentOrgId ? `${currentOrgName} (${currentOrgId})` : 'No organisation selected'}
                  </div>
                </div>
              </div>

              {error && <div style={{ marginTop: 12 }}><Alert variant="error">{error}</Alert></div>}
            </div>
          </Card>

          <Card>
            <div style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: 'var(--app-text)' }}>Add org rule</h3>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--app-text)' }}>
                  Event type
                  <input
                    value={createDraft.event_type}
                    onChange={(e) => setCreateDraft({ ...createDraft, event_type: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--app-border)', background: 'var(--app-surface)', color: 'var(--app-text)' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--app-text)' }}>
                  Channel
                  <select
                    value={createDraft.channel}
                    onChange={(e) => setCreateDraft({ ...createDraft, channel: e.target.value as any })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--app-border)', background: 'var(--app-surface)', color: 'var(--app-text)' }}
                  >
                    <option value="in_app">In-app</option>
                    <option value="email">Email</option>
                    <option value="push">Push</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--app-text)' }}>
                  Target role (optional)
                  <input
                    value={createDraft.target_role}
                    onChange={(e) => setCreateDraft({ ...createDraft, target_role: e.target.value })}
                    placeholder="org_admin"
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--app-border)', background: 'var(--app-surface)', color: 'var(--app-text)' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--app-text)' }}>
                  Priority
                  <select
                    value={String(createDraft.priority)}
                    onChange={(e) => setCreateDraft({ ...createDraft, priority: Number(e.target.value) })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--app-border)', background: 'var(--app-surface)', color: 'var(--app-text)' }}
                  >
                    <option value="0">Low</option>
                    <option value="1">Normal</option>
                    <option value="2">High</option>
                    <option value="3">Urgent</option>
                  </select>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--app-text)', marginTop: 22 }}>
                  <input
                    type="checkbox"
                    checked={createDraft.enabled}
                    onChange={(e) => setCreateDraft({ ...createDraft, enabled: e.target.checked })}
                  />
                  Enabled
                </label>
              </div>

              <div style={{ marginTop: 12 }}>
                <Button onClick={createRule} disabled={creating || !currentOrgId}>
                  {creating ? 'Creating…' : 'Create rule'}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: 'var(--app-text)' }}>Rules</h3>

              {loading ? (
                <div style={{ color: 'var(--app-text-muted)' }}>Loading…</div>
              ) : rules.length === 0 ? (
                <div style={{ color: 'var(--app-text-muted)' }}>No rules found.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        border: '1px solid var(--app-border)',
                        borderRadius: 8,
                        padding: 12,
                        background: 'var(--app-surface-2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>{rule.event_type}</span>
                          <Badge size="sm" variant={rule.enabled ? 'success' : 'warning'}>
                            {rule.enabled ? 'ENABLED' : 'DISABLED'}
                          </Badge>
                          <Badge size="sm" variant="info">{rule.channel.toUpperCase()}</Badge>
                          <Badge size="sm" variant="default">{priorityLabel[rule.priority] || String(rule.priority)}</Badge>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--app-text-muted)' }}>
                          scope={rule.scope} · role={rule.target_role || '—'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
