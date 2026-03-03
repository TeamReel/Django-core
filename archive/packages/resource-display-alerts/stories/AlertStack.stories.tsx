/**
 * Storybook stories for AlertStack component
 * Demonstrates multi-alert management and positioning
 */

import type { Meta, StoryObj } from '@storybook/react';
import { AlertStack } from '../src/components/AlertStack';
import { Alert } from '../src/components/Alert';

const meta = {
  title: 'Components/AlertStack',
  component: AlertStack,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['inline', 'top-center'],
      description: 'Positioning mode for the alert stack',
    },
    maxVisible: {
      control: 'number',
      description: 'Maximum number of visible alerts',
    },
    onViewAll: {
      action: 'onViewAll',
      description: 'Callback when "View all" is clicked',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof AlertStack>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic inline stack with 3 alerts
 */
export const Default: Story = {
  args: {
    children: (
      <>
        <Alert severity="error" title="Error" dismissible>
          Failed to save changes. Please try again.
        </Alert>
        <Alert severity="warning" title="Warning" dismissible>
          Your session will expire in 5 minutes.
        </Alert>
        <Alert severity="success" title="Success" dismissible>
          Settings saved successfully.
        </Alert>
      </>
    ),
  },
};

/**
 * Stack with custom maxVisible limit
 */
export const LimitedVisible: Story = {
  args: {
    maxVisible: 3,
    children: (
      <>
        <Alert severity="error">Error 1: Database connection failed</Alert>
        <Alert severity="error">Error 2: API timeout</Alert>
        <Alert severity="warning">Warning: High memory usage</Alert>
        <Alert severity="warning">Warning: Slow response time</Alert>
        <Alert severity="info">Info: Maintenance scheduled</Alert>
        <Alert severity="info">Info: New feature available</Alert>
      </>
    ),
  },
};

/**
 * Inline positioning (default)
 */
export const InlinePosition: Story = {
  args: {
    position: 'inline',
    children: (
      <>
        <Alert severity="info" title="System Update" dismissible>
          A system update is available. Click here to learn more.
        </Alert>
        <Alert severity="warning" title="Low Credits" dismissible>
          You have 50 credits remaining. Consider purchasing more.
        </Alert>
      </>
    ),
  },
};

/**
 * Top-center fixed positioning (page-level banner)
 */
export const TopCenterPosition: Story = {
  args: {
    position: 'top-center',
    children: (
      <>
        <Alert severity="error" title="Critical Error" dismissible>
          Your account has been locked. Contact support.
        </Alert>
      </>
    ),
  },
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * All severity levels
 */
export const AllSeverities: Story = {
  args: {
    children: (
      <>
        <Alert severity="error" title="Error" dismissible>
          This is an error alert with a dismiss button.
        </Alert>
        <Alert severity="warning" title="Warning" dismissible>
          This is a warning alert with a dismiss button.
        </Alert>
        <Alert severity="success" title="Success" dismissible>
          This is a success alert with a dismiss button.
        </Alert>
        <Alert severity="info" title="Info" dismissible>
          This is an info alert with a dismiss button.
        </Alert>
      </>
    ),
  },
};

/**
 * More than 5 alerts (shows "View all" button)
 */
export const WithViewAll: Story = {
  args: {
    maxVisible: 5,
    children: (
      <>
        <Alert severity="error">Critical: Database connection failed</Alert>
        <Alert severity="error">Error: Payment processing failed</Alert>
        <Alert severity="warning">Warning: API rate limit approaching</Alert>
        <Alert severity="warning">Warning: High CPU usage detected</Alert>
        <Alert severity="warning">Warning: Disk space low</Alert>
        <Alert severity="info">Info: Backup completed successfully</Alert>
        <Alert severity="info">Info: New users signed up</Alert>
        <Alert severity="success">Success: Deployment completed</Alert>
      </>
    ),
  },
};

/**
 * Single alert
 */
export const SingleAlert: Story = {
  args: {
    children: (
      <Alert severity="success" title="Welcome!" dismissible>
        Your account has been created successfully. Get started by exploring the dashboard.
      </Alert>
    ),
  },
};

/**
 * Empty stack
 */
export const EmptyStack: Story = {
  args: {
    children: null,
  },
};

/**
 * Mixed alert types with actions
 */
export const MixedAlertsWithActions: Story = {
  args: {
    maxVisible: 4,
    children: (
      <>
        <Alert
          severity="error"
          title="Payment Failed"
          dismissible
          action={
            <button
              style={{
                padding: '6px 12px',
                backgroundColor: 'white',
                border: '1px solid #dc2626',
                borderRadius: '4px',
                color: '#dc2626',
                cursor: 'pointer',
              }}
            >
              Retry Payment
            </button>
          }
        >
          Your payment method was declined. Please update your payment information.
        </Alert>
        <Alert
          severity="warning"
          title="Verification Required"
          dismissible
          action={
            <button
              style={{
                padding: '6px 12px',
                backgroundColor: 'white',
                border: '1px solid #ea580c',
                borderRadius: '4px',
                color: '#ea580c',
                cursor: 'pointer',
              }}
            >
              Verify Now
            </button>
          }
        >
          Please verify your email address to unlock all features.
        </Alert>
        <Alert severity="info" title="Scheduled Maintenance" dismissible>
          System maintenance is scheduled for tonight at 2 AM EST.
        </Alert>
      </>
    ),
  },
};

/**
 * Real-world notification scenario
 */
export const NotificationScenario: Story = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '400px' }}>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <AlertStack maxVisible={3}>
        <Alert severity="error" title="Action Required" dismissible>
          Your subscription expires in 3 days. Renew now to avoid service interruption.
        </Alert>
        <Alert severity="warning" title="API Limit Warning" dismissible>
          You've used 90% of your monthly API quota. Consider upgrading your plan.
        </Alert>
        <Alert severity="success" title="Deployment Successful" dismissible>
          Version 2.1.0 has been deployed to production successfully.
        </Alert>
        <Alert severity="info" title="New Feature" dismissible>
          Check out our new analytics dashboard in the Reports section.
        </Alert>
        <Alert severity="info" title="Team Invite" dismissible>
          John Doe has invited you to join the "Marketing" team.
        </Alert>
      </AlertStack>
      <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>Page Content</h2>
        <p>Your main dashboard content goes here...</p>
      </div>
    </div>
  ),
};

/**
 * Top-center banner with multiple alerts
 */
export const TopBanner: Story = {
  args: {
    position: 'top-center',
    maxVisible: 2,
    children: (
      <>
        <Alert severity="warning" title="Maintenance Notice" dismissible>
          Scheduled maintenance will occur tonight from 2-4 AM EST.
        </Alert>
        <Alert severity="info" dismissible>
          New feature: Dark mode is now available in settings!
        </Alert>
        <Alert severity="info" dismissible>
          Your team has 5 new members waiting for approval.
        </Alert>
      </>
    ),
  },
  parameters: {
    layout: 'fullscreen',
  },
};
