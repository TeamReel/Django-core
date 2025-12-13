import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Alert } from '../src/components/Alert';
import { useAlertDismissal } from '../src/hooks/useAlertDismissal';

const meta = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Alert component re-exported from @django-core/design-system with localStorage-backed dismissal support via useAlertDismissal hook.',
      },
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic alert stories (static, no dismissal)
export const Info: Story = {
  args: {
    severity: 'info',
    title: 'Information Alert',
    children: 'This is an informational message.',
  },
};

export const Success: Story = {
  args: {
    severity: 'success',
    title: 'Success!',
    children: 'Your changes have been saved.',
  },
};

export const Warning: Story = {
  args: {
    severity: 'warning',
    title: 'Warning',
    children: 'Your API credits are running low (15% remaining).',
  },
};

export const Error: Story = {
  args: {
    severity: 'error',
    title: 'Error',
    children: 'Unable to connect to the database. Please try again.',
  },
};

// Dismissible alert with temporary dismiss
export const DismissibleTemporary = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <div>
        <p>Alert dismissed temporarily (will reappear on page reload)</p>
        <button onClick={() => setVisible(true)}>Show Alert Again</button>
      </div>
    );
  }

  return (
    <Alert
      severity="warning"
      title="Low Credits Warning"
      onClose={() => setVisible(false)}
    >
      You have used 85% of your monthly API credits. Consider upgrading your plan.
    </Alert>
  );
};

// Dismissible alert with localStorage persistence
export const DismissiblePersistent = () => {
  const { isVisible, dismiss, dismissForever, reset } = useAlertDismissal({
    alertId: 'storybook-demo-alert',
  });

  if (!isVisible) {
    return (
      <div>
        <p>Alert permanently dismissed (persisted to localStorage)</p>
        <p>Key: django_core_alert_storybook-demo-alert</p>
        <button onClick={reset}>Reset (Show Alert Again)</button>
      </div>
    );
  }

  return (
    <div>
      <Alert
        severity="info"
        title="localStorage Demo"
        onClose={dismiss}
      >
        <p>This alert uses useAlertDismissal hook with localStorage persistence.</p>
        <div style={{ marginTop: '8px' }}>
          <button onClick={dismissForever} style={{ marginRight: '8px' }}>
            Never Show Again
          </button>
          <button onClick={dismiss}>
            Dismiss (Session Only)
          </button>
        </div>
      </Alert>
    </div>
  );
};

DismissiblePersistent.parameters = {
  docs: {
    description: {
      story: 'Demonstrates useAlertDismissal hook with localStorage persistence. Click "Never Show Again" to permanently dismiss, or "Dismiss" for session-only dismissal. Check localStorage in DevTools to see the stored preference.',
    },
  },
};

// Multiple alerts with different IDs
export const MultipleAlerts = () => {
  const alert1 = useAlertDismissal({ alertId: 'multi-alert-1' });
  const alert2 = useAlertDismissal({ alertId: 'multi-alert-2' });
  const alert3 = useAlertDismissal({ alertId: 'multi-alert-3' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {alert1.isVisible && (
        <Alert
          severity="error"
          title="Critical Error"
          onClose={alert1.dismissForever}
        >
          Database connection lost. Please refresh the page.
        </Alert>
      )}

      {alert2.isVisible && (
        <Alert
          severity="warning"
          title="Maintenance Scheduled"
          onClose={alert2.dismissForever}
        >
          System maintenance will occur on Dec 15 at 2:00 AM UTC.
        </Alert>
      )}

      {alert3.isVisible && (
        <Alert
          severity="info"
          title="New Feature Available"
          onClose={alert3.dismissForever}
        >
          Try our new dashboard analytics! Click here to learn more.
        </Alert>
      )}

      {!alert1.isVisible && !alert2.isVisible && !alert3.isVisible && (
        <div>
          <p>All alerts dismissed</p>
          <button onClick={() => {
            alert1.reset();
            alert2.reset();
            alert3.reset();
          }}>
            Reset All Alerts
          </button>
        </div>
      )}
    </div>
  );
};

MultipleAlerts.parameters = {
  docs: {
    description: {
      story: 'Demonstrates multiple independent alerts with separate localStorage keys. Each alert maintains its own dismissal state.',
    },
  },
};
