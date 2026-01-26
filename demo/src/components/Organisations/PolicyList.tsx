import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@django-core/design-system';

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

  // In a real implementation, we would also fetch notification policies
  // For now, we'll simulate the combined view or just fetch balance policies

  useEffect(() => {
    async function fetchPolicies() {
      try {
        setLoading(true);
        const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

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
                <a href="/notifications" style={{ color: 'var(--app-link)', textDecoration: 'none' }}>
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
                  <a href="/notifications" style={{ color: 'var(--app-link)', textDecoration: 'none' }}>
                    Manage notification preferences
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
