import React from 'react';
import { Settings, Palette, Users, Activity, Shield } from 'lucide-react';
import { SectionPageLayout } from '../components/SectionPageLayout';
import { TileGrid, TileItem } from '../components/TileGrid';
import { useUserRole } from '../components/PermissionGuards';

export default function SettingsLandingPage() {
  const { isSystemAdmin, isOrgAdmin, isLandAdmin } = useUserRole();
  const isStaff = isSystemAdmin || isLandAdmin;

  const tiles: TileItem[] = [
    {
      path: '/preferences?tab=profile',
      label: 'Preferences',
      description: 'Manage your personal settings and notifications',
      icon: Settings,
      color: '#6b7280',
    },
  ];

  if (isStaff) {
    tiles.push({
      path: '/content-templates',
      label: 'Templates',
      description: 'Configure content generation templates',
      icon: Palette,
      color: '#8b5cf6',
    });
  }

  if (isOrgAdmin) {
    tiles.push({
      path: '/permissions',
      label: 'Organisation',
      description: 'Manage members, roles, and permissions',
      icon: Users,
      color: '#3b82f6',
    });
  }

  if (isStaff) {
    tiles.push({
      path: '/health',
      label: 'Platform',
      description: 'System health, integrations, and diagnostics',
      icon: Activity,
      color: '#10b981',
    });

    tiles.push({
      path: '/flags',
      label: 'Feature Flags',
      description: 'Control feature availability across the platform',
      icon: Shield,
      color: '#f59e0b',
    });
  }

  return (
    <SectionPageLayout
      title="Settings"
      description="Configure your account and platform settings"
    >
      <TileGrid items={tiles} columns={2} />
    </SectionPageLayout>
  );
}
