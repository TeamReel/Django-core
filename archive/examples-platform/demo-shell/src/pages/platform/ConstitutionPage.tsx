import React, { useEffect, useState } from 'react';
import {
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import AppShell from '../../components/AppShell';

/**
 * T017 - Constitution Page
 *
 * Purpose: Display rule compliance and violations
 * - Shows rule categories and compliance status
 * - Displays active/total rule counts
 * - Lists recent violations if present
 */

interface ConstitutionRule {
  id: string;
  category: string;
  name: string;
  active: boolean;
  severity?: string;
  parameters?: Record<string, any>;
  violation_count?: number;
}

interface ConstitutionData {
  rules: ConstitutionRule[];
  categories: Record<string, number>;
  total_violations?: number;
}

export const ConstitutionPage: React.FC = () => {
  const [constitution, setConstitution] = useState<ConstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConstitution = async () => {
      try {
        setLoading(true);
        setError(null);

        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/constitution/rules/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const json = await response.json();
          // Handle B13 envelope (data.data) or direct response
          // The backend EnvelopeJSONRenderer wraps the response in a 'data' field
          const data = json.data ? json.data : json;
          setConstitution(data);
        } else {
          throw new Error(`Failed to fetch constitution rules (${response.status})`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch constitution rules');
        console.error('Constitution fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConstitution();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div>
          <PageHeader
            title="Constitution"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Platform' },
              { label: 'Constitution' },
            ]}
          />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">
                Loading constitution rules...
              </div>
            </Card>
          </PageContent>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div>
          <PageHeader
            title="Constitution"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Platform' },
              { label: 'Constitution' },
            ]}
          />
          <PageContent>
            <Alert variant="error" data-testid="constitution-error">
              {error}
            </Alert>
          </PageContent>
        </div>
      </AppShell>
    );
  }

  const activeRules = constitution?.rules?.filter(r => r.active).length || 0;
  const totalRules = constitution?.rules?.length || 0;

  return (
    <AppShell>
      <div>
        <PageHeader
        title="Constitution"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'Constitution' },
        ]}
      />
      <PageContent>
        <Card data-testid="constitution-summary" className="mb-4">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Active Rules</div>
                <div className="text-3xl font-bold text-blue-600">{activeRules}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Rules</div>
                <div className="text-3xl font-bold text-gray-700">{totalRules}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Violations</div>
                <div className="text-3xl font-bold text-red-600">
                  {constitution?.total_violations || 0}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {constitution?.categories && Object.keys(constitution.categories).length > 0 && (
          <div className="space-y-6">
            {Object.keys(constitution.categories).sort().map(category => {
              const categoryRules = constitution.rules.filter(r => r.category === category);
              if (categoryRules.length === 0) return null;

              return (
                <Card key={category} data-testid={`category-section-${category}`}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">{category}</h3>
                      <Badge variant="info">{categoryRules.length} Rules</Badge>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <Table
                        columns={[
                          { key: 'id', label: 'Rule Identifier' },
                          { key: 'name', label: 'Description' },
                          { key: 'severity', label: 'Severity' },
                          { key: 'parameters', label: 'Configuration' },
                          { key: 'status', label: 'Status' },
                          { key: 'violations', label: 'Violations' },
                        ]}
                        rows={categoryRules.map(rule => ({
                          id: <span className="font-mono text-blue-600 font-medium">{rule.id}</span>,
                          name: <span className="text-gray-700">{rule.name}</span>,
                          severity: (
                            <Badge
                              variant={
                                rule.severity === 'critical' ? 'error' :
                                rule.severity === 'high' ? 'warning' :
                                'info'
                              }
                            >
                              {rule.severity || 'medium'}
                            </Badge>
                          ),
                          parameters: (
                            <div className="text-xs text-gray-500 font-mono max-w-xs break-words">
                              {rule.parameters && Object.keys(rule.parameters).length > 0 ? (
                                Object.entries(rule.parameters).map(([k, v]) => (
                                  <div key={k}>
                                    <span className="font-semibold">{k}:</span> {JSON.stringify(v)}
                                  </div>
                                ))
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          ),
                          status: rule.active ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="default">Inactive</Badge>
                          ),
                          violations: (
                            <span className="font-medium text-gray-900">
                              {rule.violation_count || 0}
                            </span>
                          ),
                        }))}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!constitution?.rules?.length && (
          <Card>
            <div className="p-6 text-center text-gray-500">
              No constitution rules configured.
            </div>
          </Card>
        )}
      </PageContent>
      </div>
    </AppShell>
  );
};

export default ConstitutionPage;
