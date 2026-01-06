import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@django-core/design-system';

interface PolicyListProps {
  organisationId: string;
}

interface BalancePolicy {
  id: string;
  min_threshold: number;
  action: string;
  is_active: boolean;
  currency: string;
}

interface NotificationPolicy {
  id: string;
  event_type: string;
  channels: string[]; // ['email', 'slack']
  is_mandatory: boolean;
}

export const PolicyList: React.FC<PolicyListProps> = ({ organisationId }) => {
  const [balancePolicies, setBalancePolicies] = useState<BalancePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real implementation, we would also fetch notification policies
  // For now, we'll simulate the combined view or just fetch balance policies

  useEffect(() => {
    async function fetchPolicies() {
      try {
        setLoading(true);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

        // Fetch Balance Policies associated with this org
        // Note: The backend endpoint might need to be organization-scoped
        // For demo purposes, we will fetch from the main endpoint and filter or assumes contextual access
        const response = await fetch(`${apiBaseUrl}/api/v1/transactions/policies/?organisation=${organisationId}`, {
           headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setBalancePolicies(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        console.error('Error fetching policies', err);
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

          {balancePolicies.length === 0 ? (
             <div style={{ color: 'var(--app-text-muted)', fontStyle: 'italic' }}>
               No active credit policies configured.
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {balancePolicies.map(policy => (
                <div key={policy.id} style={{
                  padding: '12px',
                  border: '1px solid var(--app-border)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--app-surface-2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>Low Balance Alert</span>
                    <Badge variant={policy.is_active ? 'success' : 'default'} size="sm">
                      {policy.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                    Trigger when balance &lt; <strong>{policy.min_threshold} {policy.currency}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--app-text-muted)', marginTop: '4px' }}>
                    Action: {policy.action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Compliance / Notifications Mock */}
      <Card>
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--app-text)' }}>Compliance & Notifications</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{
                padding: '12px',
                border: '1px solid var(--app-border)',
                borderRadius: '6px',
                backgroundColor: 'var(--app-surface-2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>GDPR Data Retention</span>
                  <Badge variant="info" size="sm">System Default</Badge>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                   Audit logs retained for <strong>90 days</strong>.
                </div>
             </div>

             <div style={{
                padding: '12px',
                border: '1px solid var(--app-border)',
                borderRadius: '6px',
                backgroundColor: 'var(--app-surface-2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>Security Alerts</span>
                  <Badge variant="warning" size="sm">Mandatory</Badge>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                   Notify Owners via Email on suspicious logins.
                </div>
             </div>
          </div>
        </div>
      </Card>

    </div>
  );
};
