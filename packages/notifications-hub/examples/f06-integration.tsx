/**
 * F06 Layouts Integration Example
 *
 * This example shows how to integrate @django-core/notifications-hub
 * with @django-core/layouts for a complete application shell with
 * notifications.
 */

import React from 'react';
import { Shell, Header, Sidebar, Content } from '@django-core/layouts';
import { AuthProvider } from '@django-core/auth';
import { ContextSwitcherProvider } from '@django-core/context-switcher';
import {
  NotificationsProvider,
  NotificationPanel,
  UnreadBadge,
} from '@django-core/notifications-hub';
import { Icon, Button } from '@django-core/design-system';

export function AppWithNotifications() {
  const [notificationsPanelOpen, setNotificationsPanelOpen] = React.useState(false);

  return (
    <AuthProvider config={{ apiBaseUrl: 'https://api.example.com' }}>
      <ContextSwitcherProvider>
        <NotificationsProvider
          config={{
            apiBaseUrl: 'https://api.example.com/api/v1',
            pollingInterval: 30000,
            maxToasts: 3,
          }}
        >
          <Shell>
            {/* Header with notification badge */}
            <Header>
              <Header.Logo />
              <Header.Nav>
                <Header.NavItem href="/dashboard">Dashboard</Header.NavItem>
                <Header.NavItem href="/projects">Projects</Header.NavItem>
                <Header.NavItem href="/settings">Settings</Header.NavItem>
              </Header.Nav>
              <Header.Actions>
                {/* Notification button with unread badge */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotificationsPanelOpen(true)}
                  aria-label="Open notifications"
                  style={{ position: 'relative' }}
                >
                  <Icon name="Bell" />
                  {/* Badge overlays the bell icon */}
                  <UnreadBadge
                    variant="count"
                    max={99}
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                    }}
                  />
                </Button>
                <Header.UserMenu />
              </Header.Actions>
            </Header>

            {/* Sidebar navigation */}
            <Sidebar>
              <Sidebar.Nav>
                <Sidebar.NavItem icon="Home" href="/">
                  Home
                </Sidebar.NavItem>
                <Sidebar.NavItem icon="Tasks" href="/tasks">
                  Tasks
                </Sidebar.NavItem>
                <Sidebar.NavItem icon="Team" href="/team">
                  Team
                </Sidebar.NavItem>
              </Sidebar.Nav>
            </Sidebar>

            {/* Main content area */}
            <Content>
              <YourAppContent />
            </Content>

            {/* Notification panel (slides from right) */}
            <NotificationPanel
              open={notificationsPanelOpen}
              onClose={() => setNotificationsPanelOpen(false)}
              position="right"
              title="Notifications"
              width={400}
            />
          </Shell>
        </NotificationsProvider>
      </ContextSwitcherProvider>
    </AuthProvider>
  );
}

/**
 * Alternative: Persistent notification panel in sidebar
 */
export function AppWithSidebarNotifications() {
  return (
    <AuthProvider config={{ apiBaseUrl: 'https://api.example.com' }}>
      <ContextSwitcherProvider>
        <NotificationsProvider
          config={{
            apiBaseUrl: 'https://api.example.com/api/v1',
            pollingInterval: 30000,
          }}
        >
          <Shell>
            <Header>
              <Header.Logo />
              <Header.Nav>
                <Header.NavItem href="/dashboard">Dashboard</Header.NavItem>
              </Header.Nav>
              <Header.Actions>
                <Header.UserMenu />
              </Header.Actions>
            </Header>

            {/* Left sidebar with navigation */}
            <Sidebar position="left" width={240}>
              <Sidebar.Nav>
                <Sidebar.NavItem icon="Home" href="/">
                  Home
                </Sidebar.NavItem>
                <Sidebar.NavItem icon="Tasks" href="/tasks">
                  Tasks
                </Sidebar.NavItem>
              </Sidebar.Nav>
            </Sidebar>

            {/* Right sidebar with persistent notifications panel */}
            <Sidebar position="right" width={320}>
              <NotificationPanel
                open={true} // Always open
                onClose={() => {}} // No close action
                position="right"
                title="Activity Feed"
              />
            </Sidebar>

            <Content>
              <YourAppContent />
            </Content>
          </Shell>
        </NotificationsProvider>
      </ContextSwitcherProvider>
    </AuthProvider>
  );
}

/**
 * Mobile-friendly variant with bottom sheet
 */
export function MobileAppWithNotifications() {
  const [notificationsPanelOpen, setNotificationsPanelOpen] = React.useState(false);

  return (
    <AuthProvider config={{ apiBaseUrl: 'https://api.example.com' }}>
      <ContextSwitcherProvider>
        <NotificationsProvider config={{ apiBaseUrl: 'https://api.example.com/api/v1' }}>
          <Shell variant="mobile">
            <Header>
              <Header.Logo />
              <Header.Actions>
                <Button
                  variant="ghost"
                  onClick={() => setNotificationsPanelOpen(true)}
                  aria-label="Open notifications"
                >
                  <Icon name="Bell" />
                  <UnreadBadge variant="dot" />
                </Button>
                <Header.MenuButton />
              </Header.Actions>
            </Header>

            <Content>
              <YourAppContent />
            </Content>

            {/* Bottom navigation */}
            <Shell.BottomNav>
              <Shell.BottomNavItem icon="Home" href="/">
                Home
              </Shell.BottomNavItem>
              <Shell.BottomNavItem icon="Search" href="/search">
                Search
              </Shell.BottomNavItem>
              <Shell.BottomNavItem
                icon="Bell"
                onClick={() => setNotificationsPanelOpen(true)}
              >
                <UnreadBadge variant="dot" />
                Notifications
              </Shell.BottomNavItem>
              <Shell.BottomNavItem icon="Profile" href="/profile">
                Profile
              </Shell.BottomNavItem>
            </Shell.BottomNav>

            {/* Full-height panel on mobile */}
            <NotificationPanel
              open={notificationsPanelOpen}
              onClose={() => setNotificationsPanelOpen(false)}
              position="bottom" // Slides from bottom on mobile
              title="Notifications"
            />
          </Shell>
        </NotificationsProvider>
      </ContextSwitcherProvider>
    </AuthProvider>
  );
}

// Placeholder component
function YourAppContent() {
  return (
    <div>
      <h1>Welcome to Your App</h1>
      <p>Your content goes here</p>
    </div>
  );
}
