import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

/**
 * T018 - Security Page
 *
 * Purpose: Display security events and ASVS compliance status
 * - Shows recent security events with severity
 * - Displays ASVS scorecard
 * - Lists resolved/unresolved security incidents
 */

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  resolved: boolean;
  timestamp: string;
  description: string;
}

interface ASVSControl {
  id: string;
  level: number;
  description: string;
  status: 'pass' | 'fail' | 'partial';
}

interface SecurityData {
  events: SecurityEvent[];
  asvs_scorecard?: {
    level1: number;
    level2: number;
    level3: number;
  };
  asvs_controls?: ASVSControl[];
  total_events?: number;
  resolved_events?: number;
}

const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' | 'success' => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
};

const FilterButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '6px 16px',
      borderRadius: '20px',
      border: '1px solid',
      borderColor: active ? 'var(--app-primary)' : 'var(--app-border)',
      backgroundColor: active ? 'var(--app-surface-active)' : 'var(--app-surface)',
      color: active ? 'var(--app-primary)' : 'var(--app-text)',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
      transition: 'all 0.2s',
      outline: 'none',
    }}
  >
    {children}
  </button>
);

export const SecurityPage: React.FC = () => {
  const { user } = useAuth();
  const { context, organisations } = useContextSwitcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use URL params for filtering (shareable URLs)
  const filterSeverity = searchParams.get('severity') || 'all';
  const filterStatus = searchParams.get('status') || 'all';

  // Fix: Check 'role' property from API (UserListSerializer)
  // The API returns 'superadmin' for superusers, 'admin' for staff, 'user' for others
  const isSystemAdmin = (user as any)?.role === 'superadmin' || (user as any)?.role === 'admin';

  // Check for admin OR coach role
  const isOrgAdmin = (user as any)?.organisations?.some((org: any) =>
    org.role?.toLowerCase().includes('admin') ||
    org.role?.toLowerCase().includes('coach')
  );

  const currentOrgSlug = searchParams.get('org') || '';

  // Enforce Org Admin Scoping (preserve other params)
  useEffect(() => {
    if (!isSystemAdmin && isOrgAdmin) {
      const currentOrg = organisations.find(o => o.id === context.organisation?.id);
      let targetSlug = '';

      if (currentOrg) {
        targetSlug = currentOrg.slug || '';
      } else if (!currentOrg && organisations.length > 0 && !currentOrgSlug) {
         // Fallback to first org if no context
         const firstAdminOrg = (user as any)?.organisations?.find((o: any) =>
            o.role?.toLowerCase().includes('admin') ||
            o.role?.toLowerCase().includes('coach')
         );
         if (firstAdminOrg) {
             targetSlug = firstAdminOrg.slug;
         }
      }

      if (targetSlug && currentOrgSlug !== targetSlug) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('org', targetSlug);
          return next;
        });
      }
    }
  }, [isSystemAdmin, isOrgAdmin, context.organisation?.id, organisations, currentOrgSlug, setSearchParams, user]);

  useEffect(() => {
    const fetchSecurity = async () => {
      if (!isSystemAdmin && !currentOrgSlug) {
        return;
      }

      try {
        // Only show full page loading on initial fetch
        if (!security) {
          setLoading(true);
        }
        setError(null);

        const query = new URLSearchParams();
        if (currentOrgSlug) query.append('org', currentOrgSlug);
        if (filterSeverity !== 'all') query.append('severity', filterSeverity);
        if (filterStatus !== 'all') query.append('status', filterStatus);

        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/security/events/?${query.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const rawData = await response.json();
          // Handle B13 response envelope
          const data = (rawData.data || rawData) as SecurityData;
          setSecurity(data);
        } else {
          // Try to get error details from response
          let errorMessage = `API error: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage += ` - ${errorData.error}`;
            } else if (errorData.detail) {
                errorMessage += ` - ${errorData.detail}`;
            }
          } catch (e) {
            // Ignore JSON parse error
          }
          throw new Error(errorMessage);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch security data');
        console.error('Security fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurity();
  }, [currentOrgSlug, isSystemAdmin, filterSeverity, filterStatus]);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ org: val });
    } else {
      setSearchParams({});
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Security"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Platform' },
            { label: 'Security' },
          ]}
        />
        <PageContent>
          <Card>
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--app-text-muted)' }}>
              Loading security data...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Security"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Platform' },
            { label: 'Security' },
          ]}
        />
        <PageContent>
          <Alert variant="error" data-testid="security-error">
            {error}
          </Alert>
        </PageContent>
      </div>
    );
  }

  const unresolvedEvents = security?.events?.filter(e => !e.resolved).length || 0;
  const criticalEvents = security?.events?.filter(e => e.severity === 'critical' && !e.resolved).length || 0;

  return (
    <AppShell>
      <div>
        <PageHeader
          title="Security"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Platform' },
            { label: 'Security' },
          ]}
          actions={
            isSystemAdmin && (
              <select
                value={currentOrgSlug}
                onChange={handleOrgChange}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">All Organisations</option>
                {organisations.map(org => (
                  <option key={org.id} value={org.slug}>{org.name}</option>
                ))}
              </select>
            )
          }
      />
      <PageContent>
        <Card data-testid="security-summary" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface)' }}>
                <div style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>Total Events</div>
                <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--app-text)' }}>{security?.total_events || 0}</div>
              </div>
              <div style={{ padding: '16px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface)' }}>
                <div style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>Resolved</div>
                <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--app-success)' }}>{security?.resolved_events || 0}</div>
              </div>
              <div style={{ padding: '16px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface)' }}>
                <div style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>Unresolved</div>
                <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--app-warning)' }}>{unresolvedEvents}</div>
              </div>
              <div style={{ padding: '16px', border: '1px solid var(--app-border)', borderRadius: '8px', backgroundColor: 'var(--app-surface)' }}>
                <div style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>Critical</div>
                <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--app-error)' }}>{criticalEvents}</div>
              </div>
            </div>
          </div>
        </Card>

        {security?.asvs_scorecard && (
          <Card data-testid="asvs-scorecard" style={{ marginBottom: '16px' }}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>ASVS Scorecard</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', border: '1px solid var(--app-border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>Level 1 (Completeness)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--app-primary)', marginTop: '8px' }}>
                    {security.asvs_scorecard.level1}%
                  </div>
                </div>
                <div style={{ padding: '16px', border: '1px solid var(--app-border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>Level 2 (Security Controls)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--app-success)', marginTop: '8px' }}>
                    {security.asvs_scorecard.level2}%
                  </div>
                </div>
                <div style={{ padding: '16px', border: '1px solid var(--app-border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>Level 3 (Advanced)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--app-primary)', marginTop: '8px' }}>
                    {security.asvs_scorecard.level3}%
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--app-surface-2)', borderRadius: '6px', fontSize: '13px', color: 'var(--app-link)' }}>
                <strong>What is this?</strong> The Application Security Verification Standard (ASVS) measures your security posture.
                To improve your score, resolve the <strong>Open</strong> security violations listed below.
              </div>
            </div>
          </Card>
        )}

        {security && (
          <Card data-testid="security-events">
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>Recent Security Events</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: 'var(--app-surface-2)', borderRadius: '8px', border: '1px solid var(--app-border)' }}>
                  {/* Status Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--app-text-muted)', minWidth: '60px' }}>Status:</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['all', 'open', 'resolved'].map(status => (
                        <FilterButton
                          key={status}
                          active={filterStatus === status}
                          onClick={() => setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            status === 'all' ? next.delete('status') : next.set('status', status);
                            return next;
                          }, { replace: true })}
                        >
                          {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </FilterButton>
                      ))}
                    </div>
                  </div>

                  {/* Severity Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--app-text-muted)', minWidth: '60px' }}>Severity:</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['all', 'critical', 'high', 'medium', 'low'].map(sev => (
                        <FilterButton
                          key={sev}
                          active={filterSeverity === sev}
                          onClick={() => setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            sev === 'all' ? next.delete('severity') : next.set('severity', sev);
                            return next;
                          }, { replace: true })}
                        >
                          {sev === 'all' ? 'All Severities' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                        </FilterButton>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {security.events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--app-muted-text)', backgroundColor: 'var(--app-surface-2)', borderRadius: '8px' }}>
                    No events found matching your filters.
                  </div>
                ) : (
                  security.events.slice(0, 10).map(event => (
                  <div
                    key={event.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--app-border)', borderRadius: '4px' }}
                    data-testid={`event-${event.id}`}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '500' }}>{event.event_type}</span>
                        <Badge variant={getSeverityColor(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                        {event.resolved ? (
                          <Badge variant="success">Resolved</Badge>
                        ) : (
                          <Badge variant="error">Open</Badge>
                        )}
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--app-text-muted)', margin: 0 }}>{event.description}</p>
                      <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '4px', marginBottom: 0 }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </Card>
        )}
      </PageContent>
      </div>
    </AppShell>
  );
};

export default SecurityPage;
