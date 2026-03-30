import { useState } from 'react';
import { Dashboard } from '@django-core/page-templates';

// Mock data
const mockData = {
  revenue: { value: '$45,231', change: '+12%', trend: 'up' },
  users: { value: '1,234', change: '+8%', trend: 'up' },
  conversion: { value: '12.5%', change: '-2%', trend: 'down' },
  avgOrder: { value: '$36.70', change: '+5%', trend: 'up' },
};

function Widget({ title, value, change, trend }: any) {
  return (
    <div
      style={{
        padding: '1.5rem',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
      }}
    >
      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div
        style={{
          fontSize: '0.875rem',
          color: trend === 'up' ? '#10b981' : '#ef4444',
        }}
      >
        {change} from last month
      </div>
    </div>
  );
}

export default function DashboardDemo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  return (
    <div style={{ padding: '2rem' }}>
      {/* Demo Controls */}
      <div
        style={{
          background: 'white',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
          State Controls
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setLoading(!loading);
              setError(false);
              setIsEmpty(false);
              setPermissionDenied(false);
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: loading ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: loading ? '#eff6ff' : 'white',
              cursor: 'pointer',
            }}
          >
            {loading ? '✓ ' : ''}Loading
          </button>
          <button
            onClick={() => {
              setError(!error);
              setLoading(false);
              setIsEmpty(false);
              setPermissionDenied(false);
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: error ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: error ? '#eff6ff' : 'white',
              cursor: 'pointer',
            }}
          >
            {error ? '✓ ' : ''}Error
          </button>
          <button
            onClick={() => {
              setIsEmpty(!isEmpty);
              setLoading(false);
              setError(false);
              setPermissionDenied(false);
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: isEmpty ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: isEmpty ? '#eff6ff' : 'white',
              cursor: 'pointer',
            }}
          >
            {isEmpty ? '✓ ' : ''}Empty
          </button>
          <button
            onClick={() => {
              setPermissionDenied(!permissionDenied);
              setLoading(false);
              setError(false);
              setIsEmpty(false);
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: permissionDenied ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: permissionDenied ? '#eff6ff' : 'white',
              cursor: 'pointer',
            }}
          >
            {permissionDenied ? '✓ ' : ''}Permission Denied
          </button>
        </div>
      </div>

      {/* Dashboard Template */}
      <Dashboard
        loading={loading}
        error={error ? new Error('Failed to load dashboard data') : undefined}
        isEmpty={isEmpty}
        permissionDenied={permissionDenied}
      >
        <Dashboard.Header
          title="Analytics Dashboard"
          subtitle="Track your key metrics in real-time"
          actions={
            <button
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          }
        />

        <Dashboard.FilterBar>
          <select
            style={{
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
            }}
          >
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </Dashboard.FilterBar>

        <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap="md">
          <Widget title="Total Revenue" {...mockData.revenue} />
          <Widget title="Active Users" {...mockData.users} />
          <Widget title="Conversion Rate" {...mockData.conversion} />
          <Widget title="Avg Order Value" {...mockData.avgOrder} />
        </Dashboard.Grid>
      </Dashboard>
    </div>
  );
}
