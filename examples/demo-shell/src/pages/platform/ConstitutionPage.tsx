import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Badge,
  Alert,
  Table,
} from '@django-core/design-system';

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

        const response = await fetch('/api/constitution/rules/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: ConstitutionData = await response.json();
        setConstitution(data);
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
    );
  }

  if (error) {
    return (
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
          <Alert type="error" data-testid="constitution-error">
            {error}
          </Alert>
        </PageContent>
      </div>
    );
  }

  const activeRules = constitution?.rules?.filter(r => r.active).length || 0;
  const totalRules = constitution?.rules?.length || 0;

  return (
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
          <Card data-testid="constitution-categories" className="mb-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Rule Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(constitution.categories).map(([category, count]) => (
                  <div key={category} className="flex justify-between items-center p-3 border rounded" data-testid={`category-${category}`}>
                    <span className="font-medium capitalize">{category}</span>
                    <Badge type="info">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {constitution?.rules && constitution.rules.length > 0 && (
          <Card data-testid="constitution-rules">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Rules</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="rules-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Category</th>
                      <th className="text-left py-2 px-2">Rule Name</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Violations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {constitution.rules.map(rule => (
                      <tr key={rule.id} className="border-b hover:bg-gray-50" data-testid={`rule-${rule.id}`}>
                        <td className="py-2 px-2">{rule.category}</td>
                        <td className="py-2 px-2 font-medium">{rule.name}</td>
                        <td className="py-2 px-2">
                          {rule.active ? (
                            <Badge type="success">Active</Badge>
                          ) : (
                            <Badge type="gray">Inactive</Badge>
                          )}
                        </td>
                        <td className="py-2 px-2">{rule.violation_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
      </PageContent>
    </div>
  );
};

export default ConstitutionPage;
