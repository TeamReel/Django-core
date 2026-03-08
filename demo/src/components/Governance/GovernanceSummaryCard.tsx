import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getErrorMessage } from '../../utils/errorHelpers';
import styles from './GovernanceSummaryCard.module.css';

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

  const apiBaseUrl = getApiBaseUrl();

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
      } catch (e: unknown) {
        console.error(e);
        if (cancelled) return;
        setPolicy(null);
        setSource(null);
        setError(getErrorMessage(e) || 'Failed to load governance policy');
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
      <div className="p-16">
        <div className={`gap-12 flex-wrap ${styles.header}`}>
          <div>
            <div className="fs-14 fw-800 text-primary">{title || 'Governance'}</div>
            <div className={`fs-12 ${styles.description}`}>
              {description || 'Policies that apply to credits, transactions, and notifications.'}
            </div>
          </div>

          <div className="flex-row gap-8 flex-wrap">
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
          <Alert variant="info" className="mt-12">
            {error}
          </Alert>
        )}

        <div className="mt-12">
          {loading ? (
            <div className={`fs-13 ${styles.mutedText}`}>Loading balance policy…</div>
          ) : !policy ? (
            <div className={`fs-13 ${styles.mutedText}`}>
              No explicit balance policy found for this organisation. The backend may fall back to a safe default.
            </div>
          ) : (
            <div className="p-12 border rounded-8 bg-surface-2">
              <div className="flex-between gap-12">
                <div className="fs-13 fw-800 text-primary">
                  Balance policy
                  {source ? (
                    <span className={`ml-8 fs-12 fw-700 ${styles.sourceLabel}`}>
                      ({source === 'project' ? 'Project override' : source === 'organization' ? 'Organisation default' : 'Platform default'})
                    </span>
                  ) : null}
                </div>
                <div className={`flex-row gap-8 flex-wrap ${styles.badgeRowEnd}`}>
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

              <div className={`fs-12 ${styles.policyMode}`}>
                Mode:{' '}
                <strong className="text-primary">
                  {policy.allow_negative ? 'Postpaid (can go negative)' : 'Prepaid (no negative balance)'}
                </strong>
              </div>
              <div className={`fs-12 mt-4 ${styles.policyThreshold}`}>
                Warn threshold:{' '}
                <strong className="text-primary">{policy.warn_threshold ?? '—'}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
