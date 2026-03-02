import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
  Users, Library, Sparkles, Settings, Activity, Palette,
  BookOpen, Folder, ClipboardCheck, GitBranch,
} from 'lucide-react';

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
    title: 'OVERVIEW',
    visibility: 'everyone',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, visibility: 'everyone' },
      { path: '/directory', label: 'Directory', icon: Folder, visibility: 'superadmin' },
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
      { path: '/studio', label: 'Gallery', icon: Sparkles, visibility: 'everyone' },
      { path: '/medialib', label: 'Media Library', icon: Library, visibility: 'everyone' },
      { path: '/approvals', label: 'Queue', icon: ClipboardCheck, visibility: 'everyone' },
    ],
  },
  {
    id: 'settings',
    title: 'SETTINGS',
    visibility: 'everyone',
    items: [
      { path: '/preferences?tab=profile', label: 'Preferences', icon: Settings, visibility: 'everyone' },
      { path: '/content-templates', label: 'Templates', icon: Palette, visibility: 'superadmin' },
      { path: '/workflow-templates', label: 'Workflows', icon: GitBranch, visibility: 'superadmin' },
      { path: '/permissions', label: 'Organisation', icon: Users, visibility: 'superadmin' },
      { path: '/health', label: 'Platform', icon: Activity, visibility: 'superadmin' },
    ],
  },
  {
    id: 'help',
    title: 'HELP',
    visibility: 'everyone',
    bottom: true,
    items: [
      { path: '/docs', label: 'User Guide', icon: BookOpen, visibility: 'everyone' },
    ],
  },
];
