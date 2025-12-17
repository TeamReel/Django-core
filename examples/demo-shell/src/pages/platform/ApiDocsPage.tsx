import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  PageContent,
  Card,
  Alert,
  Button,
} from '@django-core/design-system';

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
  last_updated?: string;
}

export const ApiDocsPage: React.FC = () => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [meta, setMeta] = useState<ApiDocsMeta | null>(null);

  useEffect(() => {
    // Try to fetch API metadata
    const fetchMeta = async () => {
      try {
        const response = await fetch('/api/docs/meta/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setMeta(data);
        }
      } catch (err) {
        console.error('Failed to fetch API metadata:', err);
      }
    };

    fetchMeta();
  }, []);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

  const handleIframeError = () => {
    setIframeError(true);
    setIframeLoaded(false);
  };

  return (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div>
                  <div className="text-sm text-gray-600">Last Updated</div>
                  <div className="text-sm font-mono text-gray-700 mt-2">
                    {meta.last_updated
                      ? new Date(meta.last_updated).toLocaleString()
                      : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card data-testid="api-docs-container" className="mb-4">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Interactive Documentation</h3>
              <a
                href="/api/docs/swagger.json"
                target="_blank"
                rel="noopener noreferrer"
                download
              >
                <Button data-testid="download-openapi">Download OpenAPI Spec</Button>
              </a>
            </div>

            {iframeError ? (
              <Alert type="info" data-testid="api-docs-fallback">
                <div className="space-y-3">
                  <p>
                    Interactive documentation is not available due to CORS restrictions. You can:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <a
                        href="/api/docs/swagger.json"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download the OpenAPI specification (JSON)
                      </a>
                    </li>
                    <li>
                      Visit the API docs endpoint directly at{' '}
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/docs/</code>
                    </li>
                    <li>
                      Use tools like{' '}
                      <a
                        href="https://swagger.io/tools/swagger-ui/"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Swagger UI
                      </a>{' '}
                      or{' '}
                      <a
                        href="https://www.postman.com/"
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Postman
                      </a>{' '}
                      with the spec file
                    </li>
                  </ul>
                </div>
              </Alert>
            ) : (
              <div
                className="relative w-full"
                style={{ height: '600px', backgroundColor: '#f9fafb' }}
                data-testid="api-docs-iframe-container"
              >
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
                    <span className="text-gray-500">Loading API documentation...</span>
                  </div>
                )}
                <iframe
                  src="/api/docs/"
                  title="API Documentation"
                  className="w-full h-full border-0 rounded"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock"
                  data-testid="api-docs-iframe"
                />
              </div>
            )}
          </div>
        </Card>

        <Card data-testid="api-usage-guide">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Start</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Base URL</h4>
                <code className="bg-gray-100 px-3 py-2 rounded block text-sm font-mono">
                  {window.location.origin}/api/
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
                  &nbsp;&nbsp;{window.location.origin}/api/organisations/
                </code>
              </div>
            </div>
          </div>
        </Card>
      </PageContent>
    </div>
  );
};

export default ApiDocsPage;
