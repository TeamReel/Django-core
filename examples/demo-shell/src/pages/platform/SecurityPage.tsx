import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';

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

export const SecurityPage: React.FC = () => {
  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/security/events/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: SecurityData = await response.json();
        setSecurity(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch security data');
        console.error('Security fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurity();
  }, []);

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
            <div className="text-center py-8 text-gray-500">
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
          <Alert type="error" data-testid="security-error">
            {error}
          </Alert>
        </PageContent>
      </div>
    );
  }

  const unresolvedEvents = security?.events?.filter(e => !e.resolved).length || 0;
  const criticalEvents = security?.events?.filter(e => e.severity === 'critical' && !e.resolved).length || 0;

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
        <Card data-testid="security-summary" className="mb-4">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Total Events</div>
                <div className="text-3xl font-bold text-gray-700">{security?.total_events || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Resolved</div>
                <div className="text-3xl font-bold text-green-600">{security?.resolved_events || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Unresolved</div>
                <div className="text-3xl font-bold text-orange-600">{unresolvedEvents}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Critical</div>
                <div className="text-3xl font-bold text-red-600">{criticalEvents}</div>
              </div>
            </div>
          </div>
        </Card>

        {security?.asvs_scorecard && (
          <Card data-testid="asvs-scorecard" className="mb-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">ASVS Scorecard</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600">Level 1 (Completeness)</div>
                  <div className="text-2xl font-bold text-blue-600 mt-2">
                    {security.asvs_scorecard.level1}%
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600">Level 2 (Security Controls)</div>
                  <div className="text-2xl font-bold text-green-600 mt-2">
                    {security.asvs_scorecard.level2}%
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600">Level 3 (Advanced)</div>
                  <div className="text-2xl font-bold text-purple-600 mt-2">
                    {security.asvs_scorecard.level3}%
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {security?.events && security.events.length > 0 && (
          <Card data-testid="security-events">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Security Events</h3>
              <div className="space-y-3">
                {security.events.slice(0, 10).map(event => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                    data-testid={`event-${event.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{event.event_type}</span>
                        <Badge type={getSeverityColor(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                        {event.resolved ? (
                          <Badge type="success">Resolved</Badge>
                        ) : (
                          <Badge type="error">Open</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </PageContent>
    </div>
  );
};

export default SecurityPage;
