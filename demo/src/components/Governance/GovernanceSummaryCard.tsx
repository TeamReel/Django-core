import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { getErrorMessage } from '../../utils/errorHelpers';
import styles from './GovernanceSummaryCard.module.css';
import { logger } from '@/utils/logger';

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

function unwrapBalancePolicy(raw: unknown): BalancePolicy | null {
  if (!raw) return null;
  const r = raw as Record<string, unknown>;
  if (r.status === 'success' && r.data) return r.data as BalancePolicy;
  if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) return r.data as BalancePolicy;
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
          try {
            const effRaw = await api.get<EffectivePolicyResponse>('/transactions/balance-policies/effective/', {
              params: {
                organization_id: orgId,
                project_id: String(projectId),
              },
            });
            const effPolicy = unwrapBalancePolicy(effRaw?.policy);
            if (!cancelled) {
              setPolicy(effPolicy);
              setSource(effRaw?.source || 'default');
            }
            return;
          } catch {
            // If backend doesn't have the effective endpoint yet, fall back to org-only.
          }
        }

        const raw = await api.get<BalancePolicy>(
          `/transactions/balance-policies/organization/${encodeURIComponent(orgId)}/`,
        );
        const data = unwrapBalancePolicy(raw);
        if (!cancelled) {
          setPolicy(data);
          setSource('organization');
        }
      } catch (e: unknown) {
        logger.error('Failed to load governance policy', e);
        if (cancelled) return;
        setPolicy(null);
        setSource(null);
        setError(getErrorMessage(e) || 'Kan governance-beleid niet laden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [organisationId, projectId]);

  if (!String(organisationId || '').trim()) return null;

  return (
    <Card>
      <div className="p-16">
        <div className={`gap-12 flex-wrap ${styles.header}`}>
          <div>
            <div className="fs-14 fw-800 text-primary">{title || 'Governance'}</div>
            <div className={`fs-12 ${styles.description}`}>
              {description || 'Beleid voor credits, transacties en notificaties.'}
            </div>
          </div>

          <div className="flex-row gap-8 flex-wrap">
            {!!governanceHref && (
              <Button variant="secondary" size="sm" onClick={() => navigate(governanceHref)}>
                Organisatie governance
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate('/preferences')}>
              Voorkeuren
            </Button>
            {!hideRoutingLogsLink && (
              <Button variant="secondary" size="sm" onClick={() => navigate('/routing-logs')}>
                Routeringslogboek
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
            <div className={`fs-13 ${styles.mutedText}`}>Balansbeleid laden…</div>
          ) : !policy ? (
            <div className={`fs-13 ${styles.mutedText}`}>
              Geen expliciet balansbeleid gevonden voor deze organisatie. De backend valt terug op een veilige standaard.
            </div>
          ) : (
            <div className="p-12 border rounded-8 bg-surface-2">
              <div className="flex-between gap-12">
                <div className="fs-13 fw-800 text-primary">
                  Balansbeleid
                  {source ? (
                    <span className={`ml-8 fs-12 fw-700 ${styles.sourceLabel}`}>
                      ({source === 'project' ? 'Project-override' : source === 'organization' ? 'Organisatie-standaard' : 'Platform-standaard'})
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
                Modus:{' '}
                <strong className="text-primary">
                  {policy.allow_negative ? 'Postpaid (kan negatief worden)' : 'Prepaid (geen negatief saldo)'}
                </strong>
              </div>
              <div className={`fs-12 mt-4 ${styles.policyThreshold}`}>
                Waarschuwingsdrempel:{' '}
                <strong className="text-primary">{policy.warn_threshold ?? '—'}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
