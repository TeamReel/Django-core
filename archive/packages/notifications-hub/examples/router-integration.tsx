/**
 * Router Integration Examples
 *
 * This file shows how to integrate notifications with different routing solutions:
 * - React Router (v6)
 * - Next.js App Router
 * - Next.js Pages Router
 * - Django Templates (via window.location)
 */

import React from 'react';
import { NotificationPanel, useNotifications } from '@django-core/notifications-hub';
import type { Notification } from '@django-core/notifications-hub';

// ====================
// React Router v6
// ====================

import { useNavigate, BrowserRouter } from 'react-router-dom';

export function ReactRouterIntegration() {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    // Extract URL from notification metadata
    const url = notification.metadata?.url as string | undefined;

    if (url) {
      // Use React Router navigation
      navigate(url);
      setPanelOpen(false);
    }
  };

  return (
    <NotificationPanel
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  );
}

// Wrap your app with BrowserRouter
export function AppWithReactRouter() {
  return (
    <BrowserRouter>
      <YourApp />
      <ReactRouterIntegration />
    </BrowserRouter>
  );
}

// ====================
// Next.js App Router (13+)
// ====================

'use client'; // Required for Next.js App Router

import { useRouter } from 'next/navigation';

export function NextJsAppRouterIntegration() {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const router = useRouter();

  const handleNotificationClick = (notification: Notification) => {
    const url = notification.metadata?.url as string | undefined;

    if (url) {
      // Use Next.js App Router navigation
      router.push(url);
      setPanelOpen(false);
    }
  };

  return (
    <NotificationPanel
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  );
}

// In your app layout:
// app/layout.tsx
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NotificationsProvider config={{ apiBaseUrl: process.env.NEXT_PUBLIC_API_URL! }}>
          {children}
          <NextJsAppRouterIntegration />
        </NotificationsProvider>
      </body>
    </html>
  );
}

// ====================
// Next.js Pages Router (12 and earlier)
// ====================

import { useRouter as usePagesRouter } from 'next/router';

export function NextJsPagesRouterIntegration() {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const router = usePagesRouter();

  const handleNotificationClick = (notification: Notification) => {
    const url = notification.metadata?.url as string | undefined;

    if (url) {
      // Use Next.js Pages Router navigation
      router.push(url);
      setPanelOpen(false);
    }
  };

  return (
    <NotificationPanel
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  );
}

// In your _app.tsx:
// pages/_app.tsx
export function MyApp({ Component, pageProps }: AppProps) {
  return (
    <NotificationsProvider config={{ apiBaseUrl: process.env.NEXT_PUBLIC_API_URL! }}>
      <Component {...pageProps} />
      <NextJsPagesRouterIntegration />
    </NotificationsProvider>
  );
}

// ====================
// Django Templates (Plain JS)
// ====================

export function DjangoTemplateIntegration() {
  const [panelOpen, setPanelOpen] = React.useState(false);

  const handleNotificationClick = (notification: Notification) => {
    const url = notification.metadata?.url as string | undefined;

    if (url) {
      // Use native browser navigation for Django template URLs
      window.location.href = url;
      // No need to close panel - page will navigate away
    }
  };

  return (
    <NotificationPanel
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  );
}

// ====================
// Advanced: Custom Navigation with Confirmation
// ====================

export function AdvancedRouterIntegration() {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const navigate = useNavigate(); // or useRouter() for Next.js

  const handleNotificationClick = async (notification: Notification) => {
    const url = notification.metadata?.url as string | undefined;

    if (!url) return;

    // For external URLs, confirm before navigating
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const confirmed = window.confirm(`Navigate to ${url}?`);
      if (confirmed) {
        window.open(url, '_blank');
      }
      return;
    }

    // For internal routes, navigate directly
    navigate(url);
    setPanelOpen(false);
  };

  return (
    <NotificationPanel
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  );
}

// ====================
// Advanced: Programmatic Navigation with Actions
// ====================

export function ProgrammaticNavigationExample() {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const navigate = useNavigate();
  const { markAsRead } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    // Mark notification as read when clicked
    await markAsRead(notification.id);

    // Handle different notification types differently
    switch (notification.type) {
      case 'task.assigned':
        navigate(`/tasks/${notification.metadata.task_id}`);
        break;

      case 'project.invitation':
        navigate(`/projects/${notification.metadata.project_id}/join`);
        break;

      case 'payment.failed':
        navigate('/billing/payment-method');
        break;

      case 'team.member_joined':
        navigate('/team');
        break;

      default:
        // Fallback: use metadata URL if available
        const url = notification.metadata?.url as string | undefined;
        if (url) {
          navigate(url);
        }
    }

    setPanelOpen(false);
  };

  return (
    <NotificationPanel
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  );
}

// ====================
// Advanced: Deep Linking with Query Parameters
// ====================

export function DeepLinkingExample() {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    const url = notification.metadata?.url as string | undefined;

    if (!url) return;

    // Add query parameter to track notification source
    const urlWithTracking = `${url}?from_notification=${notification.id}`;
    navigate(urlWithTracking);
    setPanelOpen(false);
  };

  // In your destination component, you can read the parameter:
  // const searchParams = new URLSearchParams(window.location.search);
  // const notificationId = searchParams.get('from_notification');
  // if (notificationId) {
  //   // Handle notification-specific behavior
  // }

  return (
    <NotificationPanel
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  );
}

// ====================
// Advanced: Navigation with Analytics Tracking
// ====================

export function AnalyticsTrackingExample() {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    // Track notification click event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'notification_click', {
        notification_id: notification.id,
        notification_type: notification.type,
        notification_severity: notification.severity,
      });
    }

    const url = notification.metadata?.url as string | undefined;
    if (url) {
      navigate(url);
      setPanelOpen(false);
    }
  };

  return (
    <NotificationPanel
      open={panelOpen}
      onClose={() => setPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  );
}

// Placeholder components
function YourApp() {
  return <div>Your App Content</div>;
}

// Placeholder types for examples
interface AppProps {
  Component: React.ComponentType<any>;
  pageProps: any;
}

// Placeholder provider for examples
function NotificationsProvider({ children, config }: { children: React.ReactNode; config: any }) {
  return <>{children}</>;
}
