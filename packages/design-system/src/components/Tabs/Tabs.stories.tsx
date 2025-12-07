import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabList, Tab, TabPanel } from './';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <Tabs defaultValue="overview">
        <TabList aria-label="Content tabs">
          <Tab value="overview">Overview</Tab>
          <Tab value="features">Features</Tab>
          <Tab value="pricing">Pricing</Tab>
        </TabList>
        <TabPanel value="overview">
          <h3>Overview</h3>
          <p>This is the overview section with general information about the product.</p>
        </TabPanel>
        <TabPanel value="features">
          <h3>Features</h3>
          <ul>
            <li>Feature 1: Easy to use</li>
            <li>Feature 2: Powerful and flexible</li>
            <li>Feature 3: Fully accessible</li>
          </ul>
        </TabPanel>
        <TabPanel value="pricing">
          <h3>Pricing</h3>
          <p>Our pricing is simple and transparent.</p>
          <p>Contact us for a quote.</p>
        </TabPanel>
      </Tabs>
    </div>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <Tabs defaultValue="active">
        <TabList aria-label="Status tabs">
          <Tab value="active">Active</Tab>
          <Tab value="pending" disabled>Pending</Tab>
          <Tab value="completed">Completed</Tab>
        </TabList>
        <TabPanel value="active">
          <p>Active tasks are shown here.</p>
        </TabPanel>
        <TabPanel value="pending">
          <p>Pending tasks (this tab is disabled).</p>
        </TabPanel>
        <TabPanel value="completed">
          <p>Completed tasks are shown here.</p>
        </TabPanel>
      </Tabs>
    </div>
  ),
};

export const ManyTabs: Story = {
  render: () => (
    <div style={{ width: '800px' }}>
      <Tabs defaultValue="1">
        <TabList aria-label="Month tabs">
          <Tab value="1">January</Tab>
          <Tab value="2">February</Tab>
          <Tab value="3">March</Tab>
          <Tab value="4">April</Tab>
          <Tab value="5">May</Tab>
          <Tab value="6">June</Tab>
          <Tab value="7">July</Tab>
          <Tab value="8">August</Tab>
        </TabList>
        <TabPanel value="1"><p>January content</p></TabPanel>
        <TabPanel value="2"><p>February content</p></TabPanel>
        <TabPanel value="3"><p>March content</p></TabPanel>
        <TabPanel value="4"><p>April content</p></TabPanel>
        <TabPanel value="5"><p>May content</p></TabPanel>
        <TabPanel value="6"><p>June content</p></TabPanel>
        <TabPanel value="7"><p>July content</p></TabPanel>
        <TabPanel value="8"><p>August content</p></TabPanel>
      </Tabs>
    </div>
  ),
};

export const WithComplexContent: Story = {
  render: () => (
    <div style={{ width: '700px' }}>
      <Tabs defaultValue="account">
        <TabList aria-label="Settings tabs">
          <Tab value="account">Account</Tab>
          <Tab value="security">Security</Tab>
          <Tab value="notifications">Notifications</Tab>
        </TabList>
        <TabPanel value="account">
          <h3 style={{ marginTop: 0 }}>Account Settings</h3>
          <form>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Username
              </label>
              <input type="text" style={{ width: '100%', padding: '0.5rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Email
              </label>
              <input type="email" style={{ width: '100%', padding: '0.5rem' }} />
            </div>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Save Changes
            </button>
          </form>
        </TabPanel>
        <TabPanel value="security">
          <h3 style={{ marginTop: 0 }}>Security Settings</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" />
              Enable two-factor authentication
            </label>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" />
              Require password on sign-in
            </label>
          </div>
        </TabPanel>
        <TabPanel value="notifications">
          <h3 style={{ marginTop: 0 }}>Notification Preferences</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" defaultChecked />
              Email notifications
            </label>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" />
              SMS notifications
            </label>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  ),
};

export const KeyboardNavigation: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
        Try keyboard navigation:
        <br />• ←/→ to navigate tabs
        <br />• Home/End for first/last tab
        <br />• Tab key to focus panel content
      </p>
      <Tabs defaultValue="one">
        <TabList aria-label="Keyboard demo">
          <Tab value="one">One</Tab>
          <Tab value="two">Two</Tab>
          <Tab value="three">Three</Tab>
          <Tab value="four">Four</Tab>
        </TabList>
        <TabPanel value="one">
          <p>Panel one with <a href="#test">focusable link</a></p>
        </TabPanel>
        <TabPanel value="two">
          <p>Panel two with <a href="#test">focusable link</a></p>
        </TabPanel>
        <TabPanel value="three">
          <p>Panel three with <a href="#test">focusable link</a></p>
        </TabPanel>
        <TabPanel value="four">
          <p>Panel four with <a href="#test">focusable link</a></p>
        </TabPanel>
      </Tabs>
    </div>
  ),
};
