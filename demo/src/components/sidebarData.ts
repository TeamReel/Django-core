import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
  Users, Library, Sparkles, Settings, Activity, Palette, BarChart3,
  BookOpen, Folder, ClipboardCheck, GitBranch,
} from 'lucide-react';
import { routes } from '../routes';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  visibility: 'everyone' | 'org_admin' | 'staff' | 'superadmin';
}

export interface NavSection {
  id: string;
  title?: string;
  items: NavItem[];
  visibility: 'everyone' | 'org_admin' | 'staff' | 'superadmin';
  bottom?: boolean;
}

export const NAV_CONFIG: NavSection[] = [
  {
    id: 'overview',
    title: 'OVERZICHT',
    visibility: 'everyone',
    items: [
      { path: routes.dashboard(), label: 'Dashboard', icon: LayoutDashboard, visibility: 'everyone' },
      { path: routes.directory(), label: 'Directory', icon: Folder, visibility: 'superadmin' },
    ],
  },
  {
    id: 'app',
    title: 'APP',
    visibility: 'everyone',
    items: [],
  },
  {
    id: 'content',
    title: 'CONTENT',
    visibility: 'everyone',
    items: [
      { path: routes.studio(), label: 'Gallery', icon: Sparkles, visibility: 'everyone' },
      { path: routes.medialib(), label: 'Mediabibliotheek', icon: Library, visibility: 'everyone' },
      { path: routes.approvals(), label: 'Queue', icon: ClipboardCheck, visibility: 'everyone' },
    ],
  },
  {
    id: 'settings',
    title: 'INSTELLINGEN',
    visibility: 'everyone',
    items: [
      { path: routes.preferences({ tab: 'profile' }), label: 'Voorkeuren', icon: Settings, visibility: 'everyone' },
      { path: routes.contentTemplates(), label: 'Templates', icon: Palette, visibility: 'superadmin' },
      { path: routes.workflowTemplates(), label: 'Workflows', icon: GitBranch, visibility: 'superadmin' },
      { path: routes.appBackgrounds(), label: 'Achtergronden', icon: Library, visibility: 'superadmin' },
      { path: routes.permissions(), label: 'Organisatie', icon: Users, visibility: 'superadmin' },
      { path: routes.health(), label: 'Platform', icon: Activity, visibility: 'superadmin' },
      { path: routes.platformStats(), label: 'Stats Dashboard', icon: BarChart3, visibility: 'superadmin' },
    ],
  },
  {
    id: 'help',
    title: 'HULP',
    visibility: 'everyone',
    bottom: true,
    items: [
      { path: routes.docs(), label: 'Handleiding', icon: BookOpen, visibility: 'everyone' },
    ],
  },
];
