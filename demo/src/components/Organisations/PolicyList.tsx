import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert } from '@django-core/design-system';
import { useUserRole } from '../PermissionGuards';
import { api, ApiError } from '@/api';
import { getErrorMessage } from '../../utils/errorHelpers';
import styles from './PolicyList.module.css';

interface PolicyListProps {
  organisationId: string;
}

interface BalancePolicy {
  id: string;
  allow_negative: boolean;
  warn_threshold: string | null;
  enforcement_mode: 'block' | 'warn' | 'allow';
}

interface NotificationPolicy {
  id: number;
  organisation: string;
  organisation_name?: string;
  policy_type: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string;
  quiet_hours_rate_limit: number;
 }

export const PolicyList: React.FC<PolicyListProps> = ({ organisationId }) => {
  const [balancePolicy, setBalancePolicy] = useState<BalancePolicy | null>(null);
  const [notificationPolicy, setNotificationPolicy] = useState<NotificationPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSystemAdmin, isLandAdmin, isOrgAdmin } = useUserRole();
  const canManageOrgSettings = isSystemAdmin || isLandAdmin || isOrgAdmin;

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState<{
    allow_negative: boolean;
    enforcement_mode: 'block' | 'warn' | 'allow';
    warn_threshold: string;
  } | null>(null);
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [balanceSaveError, setBalanceSaveError] = useState<string | null>(null);
  const [balanceSaveSuccess, setBalanceSaveSuccess] = useState<string | null>(null);

  // In a real implementation, we would also fetch notification policies
  // For now, we'll simulate the combined view or just fetch balance policies

  useEffect(() => {
    async function fetchPolicies() {
      try {
        setLoading(true);

        const [balanceResult, notifResult] = await Promise.allSettled([
          api.get<BalancePolicy>(`/transactions/balance-policies/organization/${encodeURIComponent(organisationId)}/`),
          api.get<NotificationPolicy>(`/contextual-notifications/org-policies/organization/${encodeURIComponent(organisationId)}/`),
        ]);

        setBalancePolicy(balanceResult.status === 'fulfilled' ? balanceResult.value : null);
        setNotificationPolicy(notifResult.status === 'fulfilled' ? notifResult.value : null);
      } catch (err) {
        console.error(err);
        console.error('Error fetching policies', err);
        setBalancePolicy(null);
        setNotificationPolicy(null);
      } finally {
        setLoading(false);
      }
    }

    if (organisationId) {
      fetchPolicies();
    }
  }, [organisationId]);

  useEffect(() => {
    if (!balancePolicy) {
      setBalanceDraft(null);
      return;
    }
    setBalanceDraft({
      allow_negative: balancePolicy.allow_negative,
      enforcement_mode: balancePolicy.enforcement_mode,
      warn_threshold: balancePolicy.warn_threshold ?? '',
    });
  }, [balancePolicy]);

  async function saveBalancePolicy() {
    if (!organisationId || !balanceDraft) return;

    try {
      setBalanceSaving(true);
      setBalanceSaveError(null);
      setBalanceSaveSuccess(null);

      const updated = await api.patch<BalancePolicy>(
        `/transactions/balance-policies/organization/${encodeURIComponent(organisationId)}/`,
        {
          allow_negative: balanceDraft.allow_negative,
          enforcement_mode: balanceDraft.enforcement_mode,
          warn_threshold: balanceDraft.warn_threshold.trim() === '' ? null : balanceDraft.warn_threshold,
        },
      );

      setBalancePolicy(updated);
      setIsEditingBalance(false);
      setBalanceSaveSuccess('Saved');
    } catch (e: unknown) {
      console.error(e);
      if (e instanceof ApiError) {
        const body = e.body as any;
        setBalanceSaveError(body?.detail || body?.error || `Failed to save balance policy (HTTP ${e.status})`);
      } else {
        setBalanceSaveError(getErrorMessage(e) || 'Failed to save');
      }
    } finally {
      setBalanceSaving(false);
      setTimeout(() => setBalanceSaveSuccess(null), 2000);
    }
  }

  if (loading) {
    return <div className="p-20 text-muted">Loading policies...</div>;
  }

  // Fallback if no real policies found (for demo visualization if DB is strictly seeded)
  // or simply show empty state.

  return (
    <div className={`grid gap-24 ${styles.grid}`}>

      {/* Financial Governance */}
      <Card>
        <div className="p-16">
          <h3 className={`fs-18 text-primary ${styles.sectionTitle}`}>Financial Controls</h3>

          {!balancePolicy ? (
             <div className={`text-muted ${styles.emptyState}`}>
               No explicit balance policy found. The backend will fall back to a safe default.
             </div>
          ) : (
            <div className="flex-col gap-12">
              <div className="p-12 border rounded-6 bg-surface-2">
                <div className="flex-between mb-8">
                  <span className="fw-600 text-primary">Balance Policy</span>
                  <Badge
                    variant={balancePolicy.enforcement_mode === 'block' ? 'warning' : balancePolicy.enforcement_mode === 'warn' ? 'info' : 'success'}
                    size="sm"
                  >
                    {balancePolicy.enforcement_mode.toUpperCase()}
                  </Badge>
                </div>
                <div className="fs-13 text-muted">
                  Mode: <strong>{balancePolicy.allow_negative ? 'Postpaid (can go negative)' : 'Prepaid (no negative balance)'}</strong>
                </div>
                <div className="fs-13 text-muted mt-4">
                  Warn threshold: <strong>{balancePolicy.warn_threshold ?? '—'}</strong>
                </div>

                {canManageOrgSettings && (
                  <div className="mt-12 flex-row gap-12 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => setIsEditingBalance(v => !v)}>
                      {isEditingBalance ? 'Cancel' : 'Edit policy'}
                    </Button>
                  </div>
                )}

                {balanceSaveError && (
                  <div className="mt-12">
                    <Alert variant="error">{balanceSaveError}</Alert>
                  </div>
                )}
                {balanceSaveSuccess && (
                  <div className="mt-12">
                    <Alert variant="success">{balanceSaveSuccess}</Alert>
                  </div>
                )}

                {canManageOrgSettings && isEditingBalance && balanceDraft && (
                  <div className="mt-12 grid gap-10">
                    <label className="flex-row gap-8 fs-13 text-primary">
                      <input
                        type="checkbox"
                        checked={balanceDraft.allow_negative}
                        onChange={(e) => setBalanceDraft({ ...balanceDraft, allow_negative: e.target.checked })}
                      />
                      Allow negative balance (postpaid)
                    </label>

                    <label className="grid gap-6 fs-13 text-primary">
                      Enforcement mode
                      <select
                        value={balanceDraft.enforcement_mode}
                        onChange={(e) => setBalanceDraft({ ...balanceDraft, enforcement_mode: e.target.value as any })}
                        className={`rounded-6 border bg-surface text-primary ${styles.formControl}`}
                      >
                        <option value="block">BLOCK</option>
                        <option value="warn">WARN</option>
                        <option value="allow">ALLOW</option>
                      </select>
                    </label>

                    <label className="grid gap-6 fs-13 text-primary">
                      Warn threshold (optional)
                      <input
                        value={balanceDraft.warn_threshold}
                        onChange={(e) => setBalanceDraft({ ...balanceDraft, warn_threshold: e.target.value })}
                        placeholder="e.g. 10"
                        className={`rounded-6 border bg-surface text-primary ${styles.formControl}`}
                      />
                    </label>

                    <div className="flex-row gap-12 flex-wrap">
                      <Button size="sm" onClick={saveBalancePolicy} disabled={balanceSaving}>
                        {balanceSaving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Compliance / Notifications Mock */}
      <Card>
        <div className="p-16">
          <h3 className={`fs-18 text-primary ${styles.sectionTitle}`}>Compliance & Notifications</h3>

          {!notificationPolicy ? (
            <div className={`text-muted ${styles.emptyState}`}>
              No explicit notification policy found. Defaults apply.
              <div className="mt-12">
                <a href="/preferences?tab=notifications" className={`text-link ${styles.plainLink}`}>
                  Manage notification preferences
                </a>
              </div>
            </div>
          ) : (
            <div className="flex-col gap-12">
              <div
                className="p-12 border rounded-6 bg-surface-2"
              >
                <div className="flex-between mb-8">
                  <span className="fw-600 text-primary">Organisation Notification Policy</span>
                  <Badge variant={notificationPolicy.quiet_hours_enabled ? 'info' : 'success'} size="sm">
                    {notificationPolicy.quiet_hours_enabled ? 'QUIET HOURS' : 'ACTIVE'}
                  </Badge>
                </div>
                <div className="fs-13 text-muted">
                  Quiet hours: <strong>{notificationPolicy.quiet_hours_enabled ? 'Enabled' : 'Disabled'}</strong>
                </div>
                {notificationPolicy.quiet_hours_enabled && (
                  <div className="fs-13 text-muted mt-4">
                    Window: <strong>{notificationPolicy.quiet_hours_start}–{notificationPolicy.quiet_hours_end}</strong> ({notificationPolicy.quiet_hours_timezone})
                  </div>
                )}
                <div className="fs-13 text-muted mt-4">
                  Quiet-hours rate limit: <strong>{notificationPolicy.quiet_hours_rate_limit} / min</strong>
                </div>
              </div>

              <div className={`text-muted fs-13 ${styles.routingInfo}`}>
                Routing rules decide who gets notified; per-user preferences only exist when a user deviates from defaults.
                <div className="mt-12 flex-row gap-12 flex-wrap">
                  <a href="/preferences?tab=notifications" className={`text-link ${styles.plainLink}`}>
                    Manage notification preferences
                  </a>
                  <a href="/routing-rules" className={`text-link ${styles.plainLink}`}>
                    Manage routing rules
                  </a>
                  <a href="/routing-logs" className={`text-link ${styles.plainLink}`}>
                    View routing logs
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

    </div>
  );
};
