import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert } from '@django-core/design-system';
import { useUserRole } from '../PermissionGuards';
import { getApiBaseUrl } from '../../utils/apiBase';

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

function unwrap<T>(raw: any): T | null {
  if (!raw) return null;
  if (raw.status === 'success' && raw.data) return raw.data as T;
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data as T;
  return raw as T;
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
        const apiBaseUrl = getApiBaseUrl();

        const [balanceRes, notifRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/v1/transactions/balance-policies/organization/${encodeURIComponent(organisationId)}/`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }),
          fetch(`${apiBaseUrl}/api/v1/contextual-notifications/org-policies/organization/${encodeURIComponent(organisationId)}/`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }),
        ]);

        if (balanceRes.ok) {
          const raw = await balanceRes.json().catch(() => null);
          setBalancePolicy(unwrap<BalancePolicy>(raw));
        } else {
          setBalancePolicy(null);
        }

        if (notifRes.ok) {
          const raw = await notifRes.json().catch(() => null);
          setNotificationPolicy(unwrap<NotificationPolicy>(raw));
        } else {
          setNotificationPolicy(null);
        }
      } catch (err) {
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

      const apiBaseUrl = getApiBaseUrl();

      const res = await fetch(
        `${apiBaseUrl}/api/v1/transactions/balance-policies/organization/${encodeURIComponent(organisationId)}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            allow_negative: balanceDraft.allow_negative,
            enforcement_mode: balanceDraft.enforcement_mode,
            warn_threshold: balanceDraft.warn_threshold.trim() === '' ? null : balanceDraft.warn_threshold,
          }),
        }
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg =
          (payload && (payload.detail || payload.error)) ||
          `Failed to save balance policy (HTTP ${res.status})`;
        throw new Error(msg);
      }

      const raw = await res.json().catch(() => null);
      const updated = unwrap<BalancePolicy>(raw);
      setBalancePolicy(updated);
      setIsEditingBalance(false);
      setBalanceSaveSuccess('Saved');
    } catch (e: any) {
      setBalanceSaveError(e?.message || 'Failed to save');
    } finally {
      setBalanceSaving(false);
      setTimeout(() => setBalanceSaveSuccess(null), 2000);
    }
  }

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--app-text-muted)' }}>Loading policies...</div>;
  }

  // Fallback if no real policies found (for demo visualization if DB is strictly seeded)
  // or simply show empty state.

  return (
    <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

      {/* Financial Governance */}
      <Card>
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--app-text)' }}>Financial Controls</h3>

          {!balancePolicy ? (
             <div style={{ color: 'var(--app-text-muted)', fontStyle: 'italic' }}>
               No explicit balance policy found. The backend will fall back to a safe default.
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '12px',
                border: '1px solid var(--app-border)',
                borderRadius: '6px',
                backgroundColor: 'var(--app-surface-2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>Balance Policy</span>
                  <Badge
                    variant={balancePolicy.enforcement_mode === 'block' ? 'warning' : balancePolicy.enforcement_mode === 'warn' ? 'info' : 'success'}
                    size="sm"
                  >
                    {balancePolicy.enforcement_mode.toUpperCase()}
                  </Badge>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                  Mode: <strong>{balancePolicy.allow_negative ? 'Postpaid (can go negative)' : 'Prepaid (no negative balance)'}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
                  Warn threshold: <strong>{balancePolicy.warn_threshold ?? '—'}</strong>
                </div>

                {canManageOrgSettings && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Button size="sm" variant="secondary" onClick={() => setIsEditingBalance(v => !v)}>
                      {isEditingBalance ? 'Cancel' : 'Edit policy'}
                    </Button>
                  </div>
                )}

                {balanceSaveError && (
                  <div style={{ marginTop: '12px' }}>
                    <Alert variant="error">{balanceSaveError}</Alert>
                  </div>
                )}
                {balanceSaveSuccess && (
                  <div style={{ marginTop: '12px' }}>
                    <Alert variant="success">{balanceSaveSuccess}</Alert>
                  </div>
                )}

                {canManageOrgSettings && isEditingBalance && balanceDraft && (
                  <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--app-text)' }}>
                      <input
                        type="checkbox"
                        checked={balanceDraft.allow_negative}
                        onChange={(e) => setBalanceDraft({ ...balanceDraft, allow_negative: e.target.checked })}
                      />
                      Allow negative balance (postpaid)
                    </label>

                    <label style={{ display: 'grid', gap: '6px', fontSize: '13px', color: 'var(--app-text)' }}>
                      Enforcement mode
                      <select
                        value={balanceDraft.enforcement_mode}
                        onChange={(e) => setBalanceDraft({ ...balanceDraft, enforcement_mode: e.target.value as any })}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--app-border)',
                          background: 'var(--app-surface)',
                          color: 'var(--app-text)'
                        }}
                      >
                        <option value="block">BLOCK</option>
                        <option value="warn">WARN</option>
                        <option value="allow">ALLOW</option>
                      </select>
                    </label>

                    <label style={{ display: 'grid', gap: '6px', fontSize: '13px', color: 'var(--app-text)' }}>
                      Warn threshold (optional)
                      <input
                        value={balanceDraft.warn_threshold}
                        onChange={(e) => setBalanceDraft({ ...balanceDraft, warn_threshold: e.target.value })}
                        placeholder="e.g. 10"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--app-border)',
                          background: 'var(--app-surface)',
                          color: 'var(--app-text)'
                        }}
                      />
                    </label>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--app-text)' }}>Compliance & Notifications</h3>

          {!notificationPolicy ? (
            <div style={{ color: 'var(--app-text-muted)', fontStyle: 'italic' }}>
              No explicit notification policy found. Defaults apply.
              <div style={{ marginTop: '12px' }}>
                <a href="/preferences?tab=notifications" style={{ color: 'var(--app-link)', textDecoration: 'none' }}>
                  Manage notification preferences
                </a>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '12px',
                  border: '1px solid var(--app-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--app-surface-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>Organisation Notification Policy</span>
                  <Badge variant={notificationPolicy.quiet_hours_enabled ? 'info' : 'success'} size="sm">
                    {notificationPolicy.quiet_hours_enabled ? 'QUIET HOURS' : 'ACTIVE'}
                  </Badge>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                  Quiet hours: <strong>{notificationPolicy.quiet_hours_enabled ? 'Enabled' : 'Disabled'}</strong>
                </div>
                {notificationPolicy.quiet_hours_enabled && (
                  <div style={{ fontSize: '13px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
                    Window: <strong>{notificationPolicy.quiet_hours_start}–{notificationPolicy.quiet_hours_end}</strong> ({notificationPolicy.quiet_hours_timezone})
                  </div>
                )}
                <div style={{ fontSize: '13px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
                  Quiet-hours rate limit: <strong>{notificationPolicy.quiet_hours_rate_limit} / min</strong>
                </div>
              </div>

              <div style={{ color: 'var(--app-text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                Routing rules decide who gets notified; per-user preferences only exist when a user deviates from defaults.
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <a href="/preferences?tab=notifications" style={{ color: 'var(--app-link)', textDecoration: 'none' }}>
                    Manage notification preferences
                  </a>
                  <a href="/routing-rules" style={{ color: 'var(--app-link)', textDecoration: 'none' }}>
                    Manage routing rules
                  </a>
                  <a href="/routing-logs" style={{ color: 'var(--app-link)', textDecoration: 'none' }}>
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
