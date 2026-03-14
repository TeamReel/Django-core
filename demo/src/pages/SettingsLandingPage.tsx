import React from 'react';
import { Settings, Palette, Users, Activity, Shield } from 'lucide-react';
import { SectionPageLayout } from '../components/SectionPageLayout';
import { useSetBackNavigation } from '../providers/BackNavigationProvider';
import { TileGrid, TileItem } from '../components/TileGrid';
import { useUserRole } from '../components/PermissionGuards';

export default function SettingsLandingPage() {
  const { isSystemAdmin, isOrgAdmin, isLandAdmin } = useUserRole();
  const isStaff = isSystemAdmin || isLandAdmin;
  useSetBackNavigation({ label: 'Profile', path: '/profile' });

  const tiles: TileItem[] = [
    {
      path: '/profile',
      label: 'Preferences',
      description: 'Manage your personal settings and notifications',
      icon: Settings,
      color: 'var(--app-muted-text)',
    },
  ];

  if (isStaff) {
    tiles.push({
      path: '/content-templates',
      label: 'Templates',
      description: 'Configure content generation templates',
      icon: Palette,
      color: 'var(--color-violet-500)',
    });
  }

  if (isOrgAdmin) {
    tiles.push({
      path: '/permissions',
      label: 'Organisation',
      description: 'Manage members, roles, and permissions',
      icon: Users,
      color: 'var(--color-blue-500)',
    });
  }

  if (isStaff) {
    tiles.push({
      path: '/health',
      label: 'Platform',
      description: 'System health, integrations, and diagnostics',
      icon: Activity,
      color: 'var(--color-green-400)',
    });

    tiles.push({
      path: '/flags',
      label: 'Feature Flags',
      description: 'Control feature availability across the platform',
      icon: Shield,
      color: 'var(--color-amber-400)',
    });
  }

  return (
    <>
      <SectionPageLayout
        title="Settings"
        description="Configure your account and platform settings"
      >
        <TileGrid items={tiles} columns={2} />
      </SectionPageLayout>
    </>
  );
}
