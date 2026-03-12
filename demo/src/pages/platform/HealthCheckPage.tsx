import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import styles from './HealthCheckPage.module.css';
// import AppShell from '../../components/AppShell';

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

export const HealthCheckPage: React.FC = () => {
  const [data, setData] = useState<DemoHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/observability/demo-health/')
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
        return 'var(--app-success)';
      case 'degraded':
      case 'planned':
        return 'var(--app-warning)';
      case 'unhealthy':
      case 'error':
        return 'var(--app-error)';
      default:
        return 'var(--app-muted-text)';
    }
  };

  const getStatusTextColor = (status: string = 'unknown') => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'ok':
        return '#000'; // Dark text on green
      case 'degraded':
      case 'planned':
        return '#000'; // Dark text on yellow
      case 'unhealthy':
      case 'error':
        return '#fff'; // White text on red
      default:
        return '#fff';
    }
  };

  if (loading) {
    return (
      <>
        <div className="p-24">
          <h1 className="text-primary">System Health</h1>
          <p className="text-primary">Loading demo health check data...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="p-24">
          <h1 className="text-primary">System Health</h1>
          <div className={styles.errorBox}>
            <strong>❌ Error:</strong> Unable to fetch health data ({error})
          </div>
        </div>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="page-container">
        <div className="flex-between mb-24">
          <h1 className="m-0 text-primary">System Health</h1>
          <div className="text-right">
            <div className="fs-14 text-muted">Last Checked: {new Date(data.timestamp).toLocaleString()}</div>
            <div className="fs-12 text-muted mt-4">
              Demo environment – status based on application-level health checks.
            </div>
          </div>
        </div>

        <p className="mb-32 fs-16 text-primary">
          This environment uses controlled demo data to validate application behaviour and data consistency.
        </p>

        <div className={`grid gap-24 ${styles.autoFitGrid}`}>

          {/* Core Service Checks */}
          <div className="border rounded-8 p-20 bg-surface-2">
            <h2 className={`border-bottom text-primary ${styles.sectionHeading}`}>Core Services</h2>
            <div className="flex-col gap-12">
              <ServiceRow label="Database Connectivity" status={data.core_services.database?.status} detail={data.core_services.database?.latency_ms ? `${data.core_services.database.latency_ms}ms` : undefined} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
              <ServiceRow label="Cache Availability" status={data.core_services.cache?.status} detail={data.core_services.cache?.latency_ms ? `${data.core_services.cache.latency_ms}ms` : undefined} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
              <ServiceRow label="Auth & Permissions" status={data.core_services.auth?.status} detail={data.core_services.auth?.message} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
              <ServiceRow label="Balance Integrity" status={data.core_services.balance_integrity?.status} detail={data.core_services.balance_integrity?.message} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
            </div>
          </div>

          {/* Data Integrity */}
          <div className="border rounded-8 p-20 bg-surface-2">
            <h2 className={`border-bottom text-primary ${styles.sectionHeading}`}>Data Integrity</h2>
            {data.data_integrity.error ? (
               <div className="text-error">{data.data_integrity.error}</div>
            ) : (
              <div className="flex-col gap-12">
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
          <div className="border rounded-8 p-20 bg-surface-2">
            <h2 className={`border-bottom text-primary ${styles.sectionHeading}`}>Feature Availability</h2>
            <div className="flex-col gap-12">
              <ServiceRow label="Identity & Context" status={data.features.identity_context} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
              <ServiceRow label="Projects & Memberships" status={data.features.projects_memberships} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
              <ServiceRow label="Notifications" status={data.features.notifications} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
              <ServiceRow label="Transactions & Balances" status={data.features.transactions_balances} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
              <ServiceRow label="Integrations" status={data.features.integrations} getIcon={getStatusIcon} getColor={getStatusColor} getTextColor={getStatusTextColor} />
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

function ServiceRow({ label, status, detail, getIcon, getColor, getTextColor }: {
  label: string;
  status: string | undefined;
  detail?: string;
  getIcon: (s: string | undefined) => string;
  getColor: (s: string | undefined) => string;
  getTextColor: (s: string | undefined) => string;
}) {
  return (
    <div className="flex-between p-8 bg-surface rounded-4 border">
      <span className="fw-500 text-primary">{label}</span>
      <div className="flex-row gap-8">
        {detail && <span className="fs-12 text-muted">{detail}</span>}
        <span
          className={styles.statusBadge}
          style={{ '--status-bg': getColor(status), '--status-color': getTextColor(status) } as React.CSSProperties}
        >
          {getIcon(status)} {status?.toUpperCase() || 'UNKNOWN'}
        </span>
      </div>
    </div>
  );
}

function IntegrityRow({ label, count, min }: { label: string, count?: number, min: number }) {
  const isGood = (count || 0) >= min;
  const isPartial = (count || 0) > 0 && (count || 0) < min;

  let color = 'var(--app-success)'; // Green
  let textColor = '#000';

  if (isPartial) {
    color = 'var(--app-warning)'; // Yellow
    textColor = '#000';
  }
  if (!count) {
    color = 'var(--app-error)'; // Red
    textColor = '#fff';
  }

  return (
    <div className="flex-between p-8 bg-surface rounded-4 border">
      <span className="fw-500 text-primary">{label}</span>
      <span
        className={styles.integrityCount}
        style={{ '--status-bg': color, '--status-color': textColor } as React.CSSProperties}
      >
        {count ?? 0}
      </span>
    </div>
  );
}

export default HealthCheckPage;
