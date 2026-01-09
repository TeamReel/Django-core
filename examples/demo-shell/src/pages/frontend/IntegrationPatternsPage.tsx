import React, { useState, useEffect } from 'react';
import { Card, Alert, Button } from '@django-core/design-system';
import AppShell from '../../components/AppShell';

const CodeBlock = ({ code, language = 'typescript' }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div style={{ position: 'relative', marginTop: '16px', marginBottom: '16px' }}>
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        zIndex: 10
      }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <pre style={{
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        padding: '16px',
        borderRadius: '8px',
        overflowX: 'auto',
        fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        margin: 0
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const PatternSection = ({
  id,
  title,
  description,
  code,
  bestPractices,
  pitfalls
}: {
  id: string;
  title: string;
  description: string;
  code: string;
  bestPractices: string[];
  pitfalls?: string[];
}) => (
  <section id={id} style={{ marginBottom: '48px', scrollMarginTop: '100px' }}>
    <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: 'var(--app-text-primary)' }}>{title}</h2>
    <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--app-text-secondary)', marginBottom: '24px' }}>
      {description}
    </p>

    <CodeBlock code={code} />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
      <Card style={{ padding: '20px', backgroundColor: 'var(--app-surface-subtle)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--app-success)' }}>
          ✅ Best Practices
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--app-text-secondary)' }}>
          {bestPractices.map((practice, index) => (
            <li key={index} style={{ marginBottom: '8px' }}>{practice}</li>
          ))}
        </ul>
      </Card>

      {pitfalls && (
        <Card style={{ padding: '20px', backgroundColor: 'var(--app-surface-subtle)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--app-error)' }}>
            ⚠️ Common Pitfalls
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--app-text-secondary)' }}>
            {pitfalls.map((pitfall, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>{pitfall}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  </section>
);

export function IntegrationPatternsPage() {
  const [activeSection, setActiveSection] = useState('fetching');

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  const patterns = [
    {
      id: 'fetching',
      title: 'Data Fetching',
      description: 'Standard pattern for fetching data from the API using the api-client wrapper. This ensures CSRF tokens are handled automatically and errors are normalized.',
      code: `import { useEffect, useState } from 'react';
import { createApiClient } from '@django-core/api-client';
import { useAuth } from '@django-core/auth-ui';

interface UserData {
  id: string;
  name: string;
  email: string;
}

export function UserProfile() {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const apiClient = createApiClient({
      baseURL: '/api/v1'
    });

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<UserData>(\`/users/\${user?.id}\`);
        setData(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return <div>{data.name}</div>;
}`,
      bestPractices: [
        'Always use createApiClient or fetchWithCSRF',
        'Handle loading and error states explicitly',
        'Use AbortController for cleanup (optional but recommended)',
        'Type your response data with interfaces'
      ],
      pitfalls: [
        'Using raw fetch() without CSRF handling',
        'Forgetting to handle 401/403 errors',
        'Not cleaning up async effects'
      ]
    },
    {
      id: 'forms',
      title: 'Form Submission',
      description: 'Pattern for handling form submissions with validation and error feedback. Uses controlled components and proper state management.',
      code: `import { useState } from 'react';
import { Button, Input, Alert } from '@django-core/design-system';
import { createApiClient } from '@django-core/api-client';

export function CreateProjectForm() {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const apiClient = createApiClient();
      await apiClient.post('/projects', { name });
      setSuccess(true);
      setName('');
    } catch (err: any) {
      // API errors are normalized
      setError(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert variant="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      {success && <Alert variant="success" style={{ marginBottom: '16px' }}>Project created!</Alert>}

      <Input
        label="Project Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={submitting}
        required
      />

      <Button type="submit" loading={submitting} style={{ marginTop: '16px' }}>
        Create Project
      </Button>
    </form>
  );
}`,
      bestPractices: [
        'Disable submit button while submitting',
        'Show inline validation errors where possible',
        'Reset form state on success',
        'Handle server-side validation errors'
      ],
      pitfalls: [
        'Not preventing default form submission',
        'Ignoring loading states',
        'Not providing user feedback on success/failure'
      ]
    },
    {
      id: 'auth',
      title: 'Authentication',
      description: 'Integration with the centralized auth system. Access user session, check permissions, and handle login/logout flows.',
      code: `import { useAuth } from '@django-core/auth-ui';
import { Button } from '@django-core/design-system';
import { Navigate } from 'react-router-dom';

export function ProtectedDashboard() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  if (isLoading) {
    return <div>Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <h1>Welcome, {user?.firstName}</h1>
      <p>Role: {user?.role}</p>

      <Button variant="secondary" onClick={() => logout()}>
        Sign Out
      </Button>
    </div>
  );
}`,
      bestPractices: [
        'Always check isLoading before redirecting',
        'Use the useAuth hook for all session access',
        'Protect routes at the router level when possible',
        'Handle token expiration gracefully'
      ],
      pitfalls: [
        'Checking user object directly without isLoading',
        'Storing tokens manually in localStorage',
        'Implementing custom auth logic instead of using the provider'
      ]
    },
    {
      id: 'multitenancy',
      title: 'Multi-Tenancy Context',
      description: 'Handling organisation and project context. Ensure API calls respect the currently selected context.',
      code: `import { useContextSwitcher } from '@django-core/context-switcher';
import { createApiClient } from '@django-core/api-client';
import { useEffect } from 'react';

export function ProjectResources() {
  const { activeOrganisation, activeProject } = useContextSwitcher();

  useEffect(() => {
    if (!activeOrganisation) return;

    const fetchResources = async () => {
      const apiClient = createApiClient({
        headers: {
          // Context headers are often handled automatically by the client
          // but can be explicit if needed
          'X-Organisation-ID': activeOrganisation.id,
          ...(activeProject && { 'X-Project-ID': activeProject.id })
        }
      });

      // Fetch resources scoped to current context
      await apiClient.get('/resources');
    };

    fetchResources();
  }, [activeOrganisation, activeProject]);

  if (!activeOrganisation) {
    return <div>Please select an organisation</div>;
  }

  return (
    <div>
      <h2>Context: {activeOrganisation.name}</h2>
      {activeProject && <h3>Project: {activeProject.name}</h3>}
    </div>
  );
}`,
      bestPractices: [
        'React to context changes in useEffect',
        'Pass context IDs in headers for scoped requests',
        'Handle "no context selected" state',
        'Use the useContextSwitcher hook'
      ],
      pitfalls: [
        'Assuming context is always available',
        'Caching data across context switches',
        'Hardcoding organisation IDs'
      ]
    },
    {
      id: 'errors',
      title: 'Error Handling & Retry',
      description: 'Robust error handling strategies including Error Boundaries and retry logic for transient failures.',
      code: `import { ErrorBoundary } from 'react-error-boundary';
import { Button, Alert } from '@django-core/design-system';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <Alert variant="error" title="Something went wrong">
      <p>{error.message}</p>
      <Button onClick={resetErrorBoundary} size="sm" style={{ marginTop: '8px' }}>
        Try again
      </Button>
    </Alert>
  );
}

export function ResilientComponent() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app so the error doesn't happen again
      }}
    >
      <ComplexDataWidget />
    </ErrorBoundary>
  );
}

// For API retries, use the retry configuration in api-client
// const client = createApiClient({
//   retry: {
//     retries: 3,
//     retryDelay: (retryCount) => retryCount * 1000
//   }
// });`,
      bestPractices: [
        'Wrap complex widgets in ErrorBoundaries',
        'Provide a way for users to recover (retry)',
        'Log errors to observability service',
        'Distinguish between network and application errors'
      ],
      pitfalls: [
        'Wrapping the entire app in a single boundary',
        'Swallowing errors without logging',
        'Infinite retry loops'
      ]
    }
  ];

  return (
    <AppShell>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--app-bg)' }}>
        {/* Sidebar Navigation */}
        <div style={{
          width: '280px',
          position: 'sticky',
          top: '64px',
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          borderRight: '1px solid var(--app-border)',
          backgroundColor: 'var(--app-surface)',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--app-text-primary)' }}>
            Patterns
          </h3>
          <nav>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {patterns.map((pattern) => (
                <li key={pattern.id} style={{ marginBottom: '8px' }}>
                  <button
                    onClick={() => scrollToSection(pattern.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeSection === pattern.id ? 'var(--app-primary-subtle)' : 'transparent',
                      color: activeSection === pattern.id ? 'var(--app-primary)' : 'var(--app-text-secondary)',
                      fontWeight: activeSection === pattern.id ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {pattern.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '48px', maxWidth: '1000px' }}>
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', color: 'var(--app-text-primary)' }}>
              Integration Patterns
            </h1>
            <p style={{ fontSize: '18px', color: 'var(--app-text-secondary)', lineHeight: '1.6' }}>
              Reference guide for integrating frontend components with backend services.
              Follow these patterns to ensure consistency, security, and reliability across the application.
            </p>
          </div>

          {patterns.map((pattern) => (
            <PatternSection key={pattern.id} {...pattern} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
