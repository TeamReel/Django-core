import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks?: {
    database?: { status: string; response_time_ms?: number };
    cache?: { status: string; response_time_ms?: number };
    tasks?: { status: string; workers?: number };
  };
}

export default function HealthStatusPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/health/')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: HealthCheck) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: '24px' }}>
          <h1>System Health</h1>
          <p>Loading health check data...</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div style={{ padding: '24px' }}>
          <h1>System Health</h1>
          <div style={{
            padding: '16px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c2c7',
            borderRadius: '4px',
            color: '#842029'
          }}>
            <strong>❌ Error:</strong> Unable to fetch health data ({error})
          </div>
        </div>
      </AppShell>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return '✅';
      case 'degraded':
      case 'warning':
        return '⚠️';
      case 'unhealthy':
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return '#d1e7dd';
      case 'degraded':
      case 'warning':
        return '#fff3cd';
      case 'unhealthy':
      case 'error':
        return '#f8d7da';
      default:
        return '#e2e3e5';
    }
  };

  return (
    <AppShell>
      <div style={{ padding: '24px' }}>
        <h1>System Health</h1>

        {/* Overall Status */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: getStatusColor(health?.status || 'unknown'),
          border: `1px solid ${health?.status === 'healthy' ? '#badbcc' : '#f5c2c7'}`,
          borderRadius: '4px'
        }}>
          <h2 style={{ marginTop: 0 }}>
            {getStatusIcon(health?.status || 'unknown')} Overall Status: {health?.status || 'Unknown'}
          </h2>
          {health?.timestamp && (
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
              Last checked: {new Date(health.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        {/* Component Checks */}
        {health?.checks && (
          <div>
            <h2>Component Status</h2>

            {/* Database */}
            {health.checks.database && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '16px' }}>
                  {getStatusIcon(health.checks.database.status)} Database
                </h3>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Status:</strong> {health.checks.database.status}
                </p>
                {health.checks.database.response_time_ms !== undefined && (
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Response Time:</strong> {health.checks.database.response_time_ms}ms
                  </p>
                )}
              </div>
            )}

            {/* Cache */}
            {health.checks.cache && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '16px' }}>
                  {getStatusIcon(health.checks.cache.status)} Cache
                </h3>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Status:</strong> {health.checks.cache.status}
                </p>
                {health.checks.cache.response_time_ms !== undefined && (
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Response Time:</strong> {health.checks.cache.response_time_ms}ms
                  </p>
                )}
              </div>
            )}

            {/* Tasks/Workers */}
            {health.checks.tasks && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '16px' }}>
                  {getStatusIcon(health.checks.tasks.status)} Background Tasks
                </h3>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <strong>Status:</strong> {health.checks.tasks.status}
                </p>
                {health.checks.tasks.workers !== undefined && (
                  <p style={{ margin: '4px 0', fontSize: '14px' }}>
                    <strong>Active Workers:</strong> {health.checks.tasks.workers}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Frontend Info */}
        <div style={{ marginTop: '32px' }}>
          <h2>Frontend Information</h2>
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Version:</strong> {import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Environment:</strong> {import.meta.env.MODE}
            </p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}>
              <strong>Build Time:</strong> {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
