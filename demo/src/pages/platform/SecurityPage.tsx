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
import { getApiBaseUrl } from '../../utils/apiBase';
import styles from './SecurityPage.module.css';
// import AppShell from '../../components/AppShell';

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
    className={styles.filterButton}
    data-active={active}
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
  const isSystemAdmin = Boolean((user as any)?.is_superuser) || (user as any)?.role === 'Superadmin';

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

        const baseUrl = getApiBaseUrl();
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
            <div className="text-center text-muted py-32">
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
    <>
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
                className={`p-8 rounded-4 ${styles.orgSelect}`}
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
        <Card data-testid="security-summary" className="mb-16">
          <div className="p-24">
            <div className={`grid gap-16 ${styles.summaryGrid}`}>
              <div className="p-16 border rounded-8 bg-surface">
                <div className="fs-14 text-muted">Total Events</div>
                <div className={`fw-700 text-primary ${styles.statValue}`}>{security?.total_events || 0}</div>
              </div>
              <div className="p-16 border rounded-8 bg-surface">
                <div className="fs-14 text-muted">Resolved</div>
                <div className={`fw-700 text-success ${styles.statValue}`}>{security?.resolved_events || 0}</div>
              </div>
              <div className="p-16 border rounded-8 bg-surface">
                <div className="fs-14 text-muted">Unresolved</div>
                <div className={`fw-700 ${styles.unresolvedValue}`}>{unresolvedEvents}</div>
              </div>
              <div className="p-16 border rounded-8 bg-surface">
                <div className="fs-14 text-muted">Critical</div>
                <div className={`fw-700 text-error ${styles.statValue}`}>{criticalEvents}</div>
              </div>
            </div>
          </div>
        </Card>

        {security?.asvs_scorecard && (
          <Card data-testid="asvs-scorecard" className="mb-16">
            <div className="p-24">
              <h3 className="fs-18 fw-600 m-0 mb-16">ASVS Scorecard</h3>
              <div className={`grid gap-16 ${styles.asvsGrid}`}>
                <div className="p-16 border rounded-8">
                  <div className="fs-14 text-muted">Level 1 (Completeness)</div>
                  <div className={`fs-24 fw-700 mt-8 ${styles.asvsLevelValue}`}>
                    {security.asvs_scorecard.level1}%
                  </div>
                </div>
                <div className="p-16 border rounded-8">
                  <div className="fs-14 text-muted">Level 2 (Security Controls)</div>
                  <div className="fs-24 fw-700 mt-8 text-success">
                    {security.asvs_scorecard.level2}%
                  </div>
                </div>
                <div className="p-16 border rounded-8">
                  <div className="fs-14 text-muted">Level 3 (Advanced)</div>
                  <div className={`fs-24 fw-700 mt-8 ${styles.asvsLevelValue}`}>
                    {security.asvs_scorecard.level3}%
                  </div>
                </div>
              </div>
              <div className="mt-16 p-12 bg-surface-2 rounded-6 fs-13 text-link">
                <strong>What is this?</strong> The Application Security Verification Standard (ASVS) measures your security posture.
                To improve your score, resolve the <strong>Open</strong> security violations listed below.
              </div>
            </div>
          </Card>
        )}

        {security && (
          <Card data-testid="security-events">
            <div className="p-24">
              <div className="mb-20">
                <h3 className="fs-18 fw-600 m-0 mb-16">Recent Security Events</h3>

                <div className="flex-col gap-12 p-16 bg-surface-2 rounded-8 border">
                  {/* Status Row */}
                  <div className="flex-row gap-12">
                    <span className={`fs-13 fw-600 text-muted ${styles.filterLabel}`}>Status:</span>
                    <div className="flex-row flex-wrap gap-8">
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
                  <div className="flex-row gap-12">
                    <span className={`fs-13 fw-600 text-muted ${styles.filterLabel}`}>Severity:</span>
                    <div className="flex-row flex-wrap gap-8">
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
              <div className="flex-col gap-12">
                {security.events.length === 0 ? (
                  <div className="text-center p-32 text-muted bg-surface-2 rounded-8">
                    No events found matching your filters.
                  </div>
                ) : (
                  security.events.slice(0, 10).map(event => (
                  <div
                    key={event.id}
                    className="flex-between p-12 border rounded-4"
                    data-testid={`event-${event.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex-row gap-8 mb-4">
                        <span className="fw-500">{event.event_type}</span>
                        <Badge variant={getSeverityColor(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                        {event.resolved ? (
                          <Badge variant="success">Resolved</Badge>
                        ) : (
                          <Badge variant="error">Open</Badge>
                        )}
                      </div>
                      <p className="fs-14 text-muted m-0">{event.description}</p>
                      <p className="fs-12 text-muted mt-4 mb-0">
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
    </>
  );
};

export default SecurityPage;
