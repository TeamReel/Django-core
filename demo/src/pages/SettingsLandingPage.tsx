import React from 'react';
import { Settings, Palette, Users, Activity, Shield } from 'lucide-react';
import { SectionPageLayout } from '../components/SectionPageLayout';
import { useSetBackNavigation } from '../providers/BackNavigationProvider';
import { TileGrid, TileItem } from '../components/TileGrid';
import { useUserRole } from '../components/PermissionGuards';

export default function SettingsLandingPage() {
  const { isSystemAdmin, isOrgAdmin, isLandAdmin } = useUserRole();
  const isStaff = isSystemAdmin || isLandAdmin;
  useSetBackNavigation({ label: 'Profiel', path: '/profile' });

  const tiles: TileItem[] = [
    {
      path: '/profile',
      label: 'Voorkeuren',
      description: 'Beheer je persoonlijke instellingen en meldingen',
      icon: Settings,
      color: 'var(--app-muted-text)',
    },
  ];

  if (isStaff) {
    tiles.push({
      path: '/content-templates',
      label: 'Templates',
      description: 'Configureer content generatie templates',
      icon: Palette,
      color: 'var(--color-violet-500)',
    });
  }

  if (isOrgAdmin) {
    tiles.push({
      path: '/permissions',
      label: 'Organisatie',
      description: 'Leden, rollen en rechten beheren',
      icon: Users,
      color: 'var(--color-blue-500)',
    });
  }

  if (isStaff) {
    tiles.push({
      path: '/health',
      label: 'Platform',
      description: 'Systeemstatus, integraties en diagnose',
      icon: Activity,
      color: 'var(--color-green-400)',
    });

    tiles.push({
      path: '/flags',
      label: 'Feature Flags',
      description: 'Beheer beschikbaarheid van functies op het platform',
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
