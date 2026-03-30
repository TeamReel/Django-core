import React, { useState } from 'react';
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Card,
  Badge,
  Button,
  Input,
  Select,
  SelectOption
} from '../../shims/design-system';
import {
  Dashboard,
  ListDetail,
  Settings
} from '../../shims/page-templates';
import { Toast } from '@django-core/notifications-hub';
import AppShell from '../../components/AppShell';

// --- Mock Data for List-Detail ---
const MOCK_TASKS = [
  { id: '1', title: 'Review PR #123', status: 'pending', priority: 'high' },
  { id: '2', title: 'Update Documentation', status: 'in-progress', priority: 'medium' },
  { id: '3', title: 'Fix Bug #456', status: 'completed', priority: 'high' },
  { id: '4', title: 'Team Meeting', status: 'pending', priority: 'low' },
];

// --- Mock Data for Settings ---
const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' },
];

export function TemplatesPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null);
  const [activeSettingsSection, setActiveSettingsSection] = useState('profile');
  const [demoToasts, setDemoToasts] = useState<any[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error') => {
    const newToast = {
      id: Date.now().toString(),
      title: type.charAt(0).toUpperCase() + type.slice(1),
      message: `This is a ${type} notification example.`,
      severity: type.toUpperCase(),
      timestamp: new Date().toISOString(),
      read: false,
      org_id: 'demo',
      type: 'system'
    };
    setDemoToasts(prev => [newToast, ...prev].slice(0, 3));
  };

  return (
    <AppShell>
      <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Page Templates</h1>
          <p className="text-gray-500">
            Standardized layout patterns for consistent UI/UX.
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
          <TabList className="mb-4">
            <Tab value="dashboard">Dashboard</Tab>
            <Tab value="list-detail">List-Detail</Tab>
            <Tab value="settings">Settings</Tab>
            <Tab value="tables">Tables</Tab>
            <Tab value="notifications">Notifications</Tab>
          </TabList>

          <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50 relative">

            {/* Dashboard Template Demo */}
            <TabPanel value="dashboard" className="h-full overflow-auto">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm text-gray-900 font-medium">Dashboard: Used for high-level overviews with metrics and activity.</p>
                <p className="text-xs text-gray-500 mt-1">Used in: <a href="/dashboard" className="hover:underline">Dashboard</a></p>
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
            </TabPanel>

            {/* List-Detail Template Demo */}
            <TabPanel value="list-detail" className="h-full">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm text-gray-900 font-medium">List–Detail: Used for resource, user, and entity management pages.</p>
                <p className="text-xs text-gray-500 mt-1">Used in: <a href="/resources" className="hover:underline">Resources</a>, <a href="/identity/users" className="hover:underline">Users</a></p>
              </div>
              <ListDetail
                selectedId={selectedTaskId}
                onSelectedIdChange={setSelectedTaskId}
                listMinWidth={300}
              >
                <ListDetail.List showSearch searchPlaceholder="Search tasks...">
                  <div className="divide-y">
                    {MOCK_TASKS.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 ${
                          selectedTaskId === task.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{task.title}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge size="sm" variant={task.status === 'completed' ? 'success' : 'info'}>
                            {task.status}
                          </Badge>
                          <span className="text-xs text-gray-500 self-center">
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ListDetail.List>
                <ListDetail.Detail>
                  {selectedTaskId ? (
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <button
                            onClick={() => setSelectedTaskId(null)}
                            className="md:hidden mb-4 text-sm text-blue-600 flex items-center gap-1 hover:underline"
                          >
                            ← Back to List
                          </button>
                          <h2 className="text-2xl font-bold">
                            {MOCK_TASKS.find(t => t.id === selectedTaskId)?.title}
                          </h2>
                        </div>
                        <Button variant="secondary" size="sm">Edit</Button>
                      </div>
                      <Card className="p-6 mb-6">
                        <h3 className="font-semibold mb-4">Description</h3>
                        <p className="text-gray-600">
                          This is a detailed description for the selected task.
                          In a real application, this would contain the full content
                          fetched from the backend.
                        </p>
                      </Card>
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4">
                          <div className="text-sm text-gray-500">Assignee</div>
                          <div className="font-medium">John Doe</div>
                        </Card>
                        <Card className="p-4">
                          <div className="text-sm text-gray-500">Due Date</div>
                          <div className="font-medium">Tomorrow</div>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Select a task to view details
                    </div>
                  )}
                </ListDetail.Detail>
              </ListDetail>
            </TabPanel>

            {/* Settings Template Demo */}
            <TabPanel value="settings" className="h-full overflow-auto">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm text-gray-900 font-medium">Settings: Used for configuration and preference pages.</p>
                <p className="text-xs text-gray-500 mt-1">Used in: <a href="/config/preferences" className="hover:underline">Preferences</a>, <a href="/profile" className="hover:underline">Profile</a></p>
              </div>
              <Settings
                sections={SETTINGS_SECTIONS}
                activeSection={activeSettingsSection}
                onActiveSectionChange={setActiveSettingsSection}
              >
                <Settings.Section sectionId="profile">
                  <Card className="p-6 max-w-2xl">
                    <h2 className="text-xl font-bold mb-6">Profile Settings</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <Input defaultValue="Brian User" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <Input defaultValue="brian@example.com" type="email" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea
                          className="w-full p-2 border rounded-md"
                          rows={4}
                          defaultValue="Software Engineer at Django Core."
                        />
                      </div>
                      <div className="pt-4 flex gap-2">
                        <Button variant="primary">Save Changes</Button>
                        <Button variant="secondary">Cancel</Button>
                      </div>
                    </div>
                  </Card>
                </Settings.Section>

                <Settings.Section sectionId="notifications">
                  <Card className="p-6 max-w-2xl">
                    <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">Email Notifications</div>
                          <div className="text-sm text-gray-500">Receive daily summaries</div>
                        </div>
                        <input type="checkbox" defaultChecked className="h-5 w-5" />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">Push Notifications</div>
                          <div className="text-sm text-gray-500">Receive real-time alerts</div>
                        </div>
                        <input type="checkbox" className="h-5 w-5" />
                      </div>
                    </div>
                  </Card>
                </Settings.Section>

                <Settings.Section sectionId="security">
                  <Card className="p-6 max-w-2xl">
                    <h2 className="text-xl font-bold mb-6">Security</h2>
                    <div className="space-y-4">
                      <Button variant="secondary">Change Password</Button>
                      <Button variant="secondary">Enable 2FA</Button>
                    </div>
                  </Card>
                </Settings.Section>
              </Settings>
            </TabPanel>

            {/* Tables Template Demo */}
            <TabPanel value="tables" className="h-full overflow-auto">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm text-gray-900 font-medium">Tables: Used for displaying collections of data.</p>
                <p className="text-xs text-gray-500 mt-1">Used in: <a href="/identity/users" className="hover:underline">Users</a>, <a href="/config/audit" className="hover:underline">Audit Log</a></p>
              </div>
              <div className="p-6 space-y-8">
                {/* Default Table */}
                <Card className="p-0 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 font-medium">Default Table</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                          <th className="p-3">Name</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[1, 2, 3].map(i => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="p-3">User {i}</td>
                            <td className="p-3 text-gray-500">Editor</td>
                            <td className="p-3"><Badge size="sm" variant="success">Active</Badge></td>
                            <td className="p-3 text-right text-blue-600 cursor-pointer hover:underline">Edit</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Empty State */}
                <Card className="p-0 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 font-medium">Empty State</div>
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-2xl mb-2">📭</div>
                    <p>No data available</p>
                  </div>
                </Card>
              </div>
            </TabPanel>

            {/* Notifications Template Demo */}
            <TabPanel value="notifications" className="h-full overflow-auto">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <p className="text-sm text-gray-900 font-medium">Notifications: Used for feedback and alerts.</p>
                <p className="text-xs text-gray-500 mt-1">Used in: Global App Shell</p>
              </div>
              <div className="p-6 space-y-8">
                {/* Toasts */}
                <Card className="p-6">
                  <h3 className="font-medium mb-4">Toast Notifications</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => addToast('success')}>Trigger Success</Button>
                    <Button onClick={() => addToast('warning')}>Trigger Warning</Button>
                    <Button onClick={() => addToast('error')}>Trigger Error</Button>
                  </div>

                  {/* Demo Toast Container - Visual only for demo */}
                  <div className="mt-6 p-4 bg-gray-100 rounded border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500 mb-2 uppercase">Live Preview</p>
                    <div className="space-y-2">
                      {demoToasts.map(toast => (
                        <Toast
                          key={toast.id}
                          notification={toast}
                          onDismiss={(id) => setDemoToasts(prev => prev.filter(t => t.id !== id))}
                          variant={toast.severity.toLowerCase() as any}
                        />
                      ))}
                      {demoToasts.length === 0 && (
                        <div className="text-sm text-gray-400 italic">Click buttons above to see toasts</div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Banners */}
                <Card className="p-6">
                  <h3 className="font-medium mb-4">Inline Banners</h3>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">ℹ️</div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            This is an informational banner used for context.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">⚠️</div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            This is a warning banner used for non-blocking issues.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabPanel>

          </div>
        </Tabs>
      </div>
    </AppShell>
  );
}
