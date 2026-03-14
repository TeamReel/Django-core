import React from 'react';
import { Card, Button } from '@/shims/design-system';
import { Dashboard } from '@/shims/page-templates';
import { routes } from '../../../routes';

export function DashboardTabPanel() {
  return (
    <>
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <p className="text-sm text-gray-900 font-medium">Dashboard: Used for high-level overviews with metrics and activity.</p>
        <p className="text-xs text-gray-500 mt-1">Used in: <a href={routes.dashboard()} className="hover:underline">Dashboard</a></p>
      </div>
      <div className="h-full">
        <Dashboard>
          <Dashboard.Header
            title="Sales Overview"
            actions={<Button variant="primary" size="sm">Download Report</Button>}
            breadcrumbs={<span className="text-sm text-gray-500">Home / Dashboard</span>}
          />

          <Dashboard.Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900">$45,231</div>
              <div className="text-xs text-green-600">↑ 12% vs last month</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Active Users</div>
              <div className="text-2xl font-bold text-gray-900">1,234</div>
              <div className="text-xs text-green-600">↑ 5% vs last month</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Bounce Rate</div>
              <div className="text-2xl font-bold text-gray-900">42.3%</div>
              <div className="text-xs text-red-600">↓ 2% vs last month</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Avg. Session</div>
              <div className="text-2xl font-bold text-gray-900">4m 12s</div>
              <div className="text-xs text-gray-500">No change</div>
            </Card>
          </Dashboard.Grid>

          <Dashboard.Grid columns={{ mobile: 1, desktop: 2 }}>
            <Card className="p-6 h-64 flex items-center justify-center bg-white">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2 opacity-50">📊</div>
                <div className="text-sm font-medium opacity-75">Revenue Chart Placeholder</div>
              </div>
            </Card>
            <Card className="p-6 h-64 flex items-center justify-center bg-white">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2 opacity-50">🥧</div>
                <div className="text-sm font-medium opacity-75">User Distribution Placeholder</div>
              </div>
            </Card>
          </Dashboard.Grid>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4 px-1">Recent Activity</h3>
            <Card>
              <div className="divide-y">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium">New order #{1000 + i}</div>
                      <div className="text-sm text-gray-500">Customer placed an order</div>
                    </div>
                    <div className="text-sm text-gray-400">2m ago</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Dashboard>
      </div>
    </>
  );
}
