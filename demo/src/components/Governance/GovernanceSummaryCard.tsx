import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { useNavigate } from 'react-router-dom';

type BalancePolicy = {
  id: string;
  allow_negative: boolean;
  warn_threshold: string | null;
  enforcement_mode: 'block' | 'warn' | 'allow';
};

type EffectivePolicyResponse = {
  source: 'project' | 'organization' | 'default';
  policy: BalancePolicy;
};

function unwrapBalancePolicy(raw: any): BalancePolicy | null {
  if (!raw) return null;
  if (raw.status === 'success' && raw.data) return raw.data as BalancePolicy;
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data as BalancePolicy;
  return raw as BalancePolicy;
}

export default function GovernanceSummaryCard(props: {
  organisationId?: string | null;
  projectId?: string | number | null;
  title?: string;
  description?: string;
  organisationGovernanceHref?: string;
  hideRoutingLogsLink?: boolean;
}) {
  const { organisationId, projectId, title, description, organisationGovernanceHref, hideRoutingLogsLink } = props;

  const navigate = useNavigate();

  const apiBaseUrl = useMemo(() => {
    const raw = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
    return raw.replace(/\/+$/, '');
  }, []);

  const [policy, setPolicy] = useState<BalancePolicy | null>(null);
  const [source, setSource] = useState<'project' | 'organization' | 'default' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const governanceHref = useMemo(() => {
    if (organisationGovernanceHref) return organisationGovernanceHref;
    const id = String(organisationId || '').trim();
    if (!id) return '';
    return `/${encodeURIComponent(id)}?tab=governance`;
  }, [organisationGovernanceHref, organisationId]);

  useEffect(() => {
    const orgId = String(organisationId || '').trim();
    if (!orgId) {
      setPolicy(null);
      setSource(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const hasProject = projectId !== undefined && projectId !== null && String(projectId).trim() !== '';
        if (hasProject) {
          const params = new URLSearchParams();
          params.set('organization_id', orgId);
          params.set('project_id', String(projectId));
          const effUrl = `${apiBaseUrl}/api/v1/transactions/balance-policies/effective/?${params.toString()}`;
          const effRes = await fetch(effUrl, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          // If backend doesn't have the effective endpoint yet, fall back to org-only.
          if (effRes.ok) {
            const effRaw = (await effRes.json().catch(() => null)) as EffectivePolicyResponse | null;
            const effPolicy = unwrapBalancePolicy((effRaw as any)?.policy);
            if (!cancelled) {
              setPolicy(effPolicy);
              setSource((effRaw as any)?.source || 'default');
            }
            return;
          }
        }

        const url = `${apiBaseUrl}/api/v1/transactions/balance-policies/organization/${encodeURIComponent(orgId)}/`;
        const res = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) {
          if (!cancelled) {
            setPolicy(null);
            setSource(null);
          }
          return;
        }

        const raw = await res.json().catch(() => null);
        const data = unwrapBalancePolicy(raw);
        if (!cancelled) {
          setPolicy(data);
          setSource('organization');
        }
      } catch (e: any) {
        if (cancelled) return;
        setPolicy(null);
        setSource(null);
        setError(e?.message || 'Failed to load governance policy');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, organisationId, projectId]);

  if (!String(organisationId || '').trim()) return null;

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--app-text)' }}>{title || 'Governance'}</div>
            <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 4 }}>
              {description || 'Policies that apply to credits, transactions, and notifications.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {!!governanceHref && (
              <Button variant="secondary" size="sm" onClick={() => navigate(governanceHref)}>
                Org governance
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate('/preferences')}>
              Preferences
            </Button>
            {!hideRoutingLogsLink && (
              <Button variant="secondary" size="sm" onClick={() => navigate('/routing-logs')}>
                Routing logs
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="info" style={{ marginTop: 12 }}>
            {error}
          </Alert>
        )}

        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--app-text-muted)' }}>Loading balance policy…</div>
          ) : !policy ? (
            <div style={{ fontSize: 13, color: 'var(--app-text-muted)' }}>
              No explicit balance policy found for this organisation. The backend may fall back to a safe default.
            </div>
          ) : (
            <div
              style={{
                padding: '12px',
                border: '1px solid var(--app-border)',
                borderRadius: 8,
                background: 'var(--app-surface-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text)' }}>
                  Balance policy
                  {source ? (
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 700 }}>
                      ({source === 'project' ? 'Project override' : source === 'organization' ? 'Organisation default' : 'Platform default'})
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {source === 'project' && (
                    <Badge variant="default" size="sm">
                      OVERRIDE
                    </Badge>
                  )}
                  <Badge
                    variant={policy.enforcement_mode === 'block' ? 'warning' : policy.enforcement_mode === 'warn' ? 'info' : 'success'}
                    size="sm"
                  >
                    {String(policy.enforcement_mode || '').toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 6 }}>
                Mode:{' '}
                <strong style={{ color: 'var(--app-text)' }}>
                  {policy.allow_negative ? 'Postpaid (can go negative)' : 'Prepaid (no negative balance)'}
                </strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 4 }}>
                Warn threshold:{' '}
                <strong style={{ color: 'var(--app-text)' }}>{policy.warn_threshold ?? '—'}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
