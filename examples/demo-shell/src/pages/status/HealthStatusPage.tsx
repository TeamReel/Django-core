import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';

interface DemoHealthResponse {
  timestamp: string;
  environment: string;
  core_services: {
    database?: { status: string; latency_ms?: number };
    cache?: { status: string; latency_ms?: number };
    auth?: { status: string; message?: string };
    balance_integrity?: { status: string; message?: string };
  };
  data_integrity: {
    organisations_total?: number;
    organisations_active?: number;
    users_total?: number;
    users_active?: number;
    organisations_with_transactions?: number;
    organisations_with_balances?: number;
    error?: string;
  };
  features: Record<string, string>;
}

export default function HealthStatusPage() {
  const [data, setData] = useState<DemoHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use VITE_API_BASE_URL if available, otherwise fallback to relative path
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    // Ensure no double slash if apiBase ends with /
    const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

    fetch(`${baseUrl}/api/observability/demo-health/`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: DemoHealthResponse) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const getStatusIcon = (status: string = 'unknown') => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'ok':
        return '✅';
      case 'degraded':
      case 'planned':
        return '⚠️';
      case 'unhealthy':
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string = 'unknown') => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'ok':
        return '#d1e7dd';
      case 'degraded':
      case 'planned':
        return '#fff3cd';
      case 'unhealthy':
      case 'error':
        return '#f8d7da';
      default:
        return '#e2e3e5';
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div style={{ padding: '24px' }}>
          <h1>System Health</h1>
          <p>Loading demo health check data...</p>
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

  if (!data) return null;

  return (
    <AppShell>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0 }}>System Health</h1>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Last Checked: {new Date(data.timestamp).toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              Demo environment – status based on application-level health checks.
            </div>
          </div>
        </div>

        <p style={{ marginBottom: '32px', fontSize: '16px', color: '#444' }}>
          This environment uses controlled demo data to validate application behaviour and data consistency.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

          {/* Core Service Checks */}
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Core Services</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ServiceRow label="Database Connectivity" status={data.core_services.database?.status} detail={data.core_services.database?.latency_ms ? `${data.core_services.database.latency_ms}ms` : undefined} getIcon={getStatusIcon} getColor={getStatusColor} />
              <ServiceRow label="Cache Availability" status={data.core_services.cache?.status} detail={data.core_services.cache?.latency_ms ? `${data.core_services.cache.latency_ms}ms` : undefined} getIcon={getStatusIcon} getColor={getStatusColor} />
              <ServiceRow label="Auth & Permissions" status={data.core_services.auth?.status} detail={data.core_services.auth?.message} getIcon={getStatusIcon} getColor={getStatusColor} />
              <ServiceRow label="Balance Integrity" status={data.core_services.balance_integrity?.status} detail={data.core_services.balance_integrity?.message} getIcon={getStatusIcon} getColor={getStatusColor} />
            </div>
          </div>

          {/* Data Integrity */}
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Data Integrity</h2>
            {data.data_integrity.error ? (
               <div style={{ color: 'red' }}>{data.data_integrity.error}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <IntegrityRow label="Total Organisations" count={data.data_integrity.organisations_total} min={1} />
                <IntegrityRow label="Active Organisations (with members)" count={data.data_integrity.organisations_active} min={1} />
                <IntegrityRow label="Total Users" count={data.data_integrity.users_total} min={10} />
                <IntegrityRow label="Active Users (in orgs)" count={data.data_integrity.users_active} min={10} />
                <IntegrityRow label="Orgs with Transactions" count={data.data_integrity.organisations_with_transactions} min={1} />
                <IntegrityRow label="Orgs with Balances" count={data.data_integrity.organisations_with_balances} min={1} />
              </div>
            )}
          </div>

          {/* Feature Availability */}
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '12px' }}>Feature Availability</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ServiceRow label="Identity & Context" status={data.features.identity_context} getIcon={getStatusIcon} getColor={getStatusColor} />
              <ServiceRow label="Projects & Memberships" status={data.features.projects_memberships} getIcon={getStatusIcon} getColor={getStatusColor} />
              <ServiceRow label="Notifications" status={data.features.notifications} getIcon={getStatusIcon} getColor={getStatusColor} />
              <ServiceRow label="Transactions & Balances" status={data.features.transactions_balances} getIcon={getStatusIcon} getColor={getStatusColor} />
              <ServiceRow label="Integrations" status={data.features.integrations} getIcon={getStatusIcon} getColor={getStatusColor} />
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}

function ServiceRow({ label, status, detail, getIcon, getColor }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {detail && <span style={{ fontSize: '12px', color: '#666' }}>{detail}</span>}
        <span style={{
          padding: '4px 8px',
          borderRadius: '12px',
          backgroundColor: getColor(status),
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {getIcon(status)} {status?.toUpperCase() || 'UNKNOWN'}
        </span>
      </div>
    </div>
  );
}

function IntegrityRow({ label, count, min }: { label: string, count?: number, min: number }) {
  const isGood = (count || 0) >= min;
  const isPartial = (count || 0) > 0 && (count || 0) < min;

  let color = '#d1e7dd'; // Green
  if (isPartial) color = '#fff3cd'; // Yellow
  if (!count) color = '#f8d7da'; // Red

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        backgroundColor: color,
        fontWeight: 'bold',
        minWidth: '40px',
        textAlign: 'center'
      }}>
        {count ?? 0}
      </span>
    </div>
  );
}
