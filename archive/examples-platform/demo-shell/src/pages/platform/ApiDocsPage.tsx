import React, { useEffect, useState } from 'react';
import {
  Card,
  Alert,
  Button,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

/**
 * T020 - API Docs Page
 *
 * Purpose: Embed API documentation with fallback
 * - Attempts to load /api/docs in iframe
 * - Falls back to link to /api/docs/swagger.json if CORS fails
 * - Shows usage statistics
 */

interface ApiDocsMeta {
  total_endpoints?: number;
  total_schemas?: number;
}

export const ApiDocsPage: React.FC = () => {
  const [meta, setMeta] = useState<ApiDocsMeta | null>(null);

  // Determine Base URL
  // Default to localhost:8000 if env var is missing (for local dev without .env)
  // In production, VITE_API_BASE_URL must be set.
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

  useEffect(() => {
    // Try to fetch API schema to extract metadata
    const fetchMeta = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/schema/?format=json`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const schema = await response.json();
          // Extract real metadata from OpenAPI schema
          const endpoints = Object.keys(schema.paths || {}).length;
          const schemas = Object.keys(schema.components?.schemas || {}).length;

          setMeta({
            total_endpoints: endpoints,
            total_schemas: schemas,
          });
        }
      } catch (err) {
        console.error('Failed to fetch API schema:', err);
        // Don't show metadata if we can't fetch real data
      }
    };

    fetchMeta();
  }, [baseUrl]);

  return (
    <AppShell>
      <div>
        <PageHeader
        title="API Documentation"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'API Docs' },
        ]}
      />
      <PageContent>
        {meta && (
          <Card data-testid="api-meta" className="mb-4">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total Endpoints</div>
                  <div className="text-3xl font-bold text-blue-600 mt-2">
                    {meta.total_endpoints || '?'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Schemas</div>
                  <div className="text-3xl font-bold text-green-600 mt-2">
                    {meta.total_schemas || '?'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card data-testid="api-docs-container" className="mb-4">
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Interactive Documentation</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              The interactive API documentation (Swagger UI) is available in a separate window.
              This allows you to test endpoints and inspect schemas directly without embedding restrictions.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href={`${baseUrl}/api/docs/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary">Open Interactive API Docs</Button>
              </a>
              <a
                href={`${baseUrl}/api/schema/?format=json`}
                target="_blank"
                rel="noopener noreferrer"
                download="openapi-schema.json"
              >
                <Button variant="outline">Download OpenAPI Spec</Button>
              </a>
            </div>
          </div>
        </Card>

        <Card data-testid="api-usage-guide">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Start</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Base URL</h4>
                <code className="bg-gray-100 px-3 py-2 rounded block text-sm font-mono">
                  {baseUrl}/api/
                </code>
              </div>
              <div>
                <h4 className="font-medium mb-2">Authentication</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Include your authentication token in the Authorization header:
                </p>
                <code className="bg-gray-100 px-3 py-2 rounded block text-sm font-mono">
                  Authorization: Bearer {'<your-token>'}
                </code>
              </div>
              <div>
                <h4 className="font-medium mb-2">Example Request</h4>
                <code className="bg-gray-100 px-3 py-2 rounded block text-sm font-mono overflow-auto">
                  curl -H "Authorization: Bearer YOUR_TOKEN" \{'\n'}
                  &nbsp;&nbsp;{baseUrl}/api/v1/organisations/
                </code>
              </div>
            </div>
          </div>
        </Card>
      </PageContent>
      </div>
    </AppShell>
  );
};

export default ApiDocsPage;
