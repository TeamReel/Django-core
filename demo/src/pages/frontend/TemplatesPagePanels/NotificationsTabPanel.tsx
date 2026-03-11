import React, { useState } from 'react';
import { Card, Button } from '../../../shims/design-system';
import { Toast, type ToastProps } from './Toast';

interface DemoToast {
  id: string;
  title: string;
  message: string;
  severity: string;
  timestamp: string;
  read: boolean;
  org_id: string;
  type: string;
}

export function NotificationsTabPanel() {
  const [demoToasts, setDemoToasts] = useState<DemoToast[]>([]);

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
    <>
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
                  notification={toast as unknown as ToastProps['notification']}
                  onDismiss={(id) => setDemoToasts(prev => prev.filter(t => t.id !== id))}
                  variant={toast.severity.toLowerCase()}
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
    </>
  );
}
