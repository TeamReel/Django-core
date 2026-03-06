/**
 * QuickActions — Compact horizontal bar for 1-tap navigation
 * to the most common actions coaches need on matchday.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid, Users, Image, Settings,
  Calendar, CreditCard,
} from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAppSelection } from '../../hooks/useAppSelection';
import styles from './QuickActions.module.css';

interface Action {
  key: string;
  label: string;
  Icon: LucideIcon;
  getPath: (ctx: { orgSlug: string; matchId: string | null }) => string;
  /** Only show this action when a match is selected */
  matchRequired?: boolean;
}

const ACTIONS: Action[] = [
  {
    key: 'matches',
    label: 'Wedstrijden',
    Icon: Calendar,
    getPath: () => '/matches',
  },
  {
    key: 'gallery',
    label: 'Gallery',
    Icon: Image,
    getPath: () => '/gallery',
  },
  {
    key: 'team',
    label: 'Selectie',
    Icon: Users,
    getPath: ({ orgSlug }) => orgSlug ? `/organisations/${orgSlug}` : '/directory',
  },
  {
    key: 'media',
    label: 'Media',
    Icon: LayoutGrid,
    getPath: () => '/media',
  },
  {
    key: 'credits',
    label: 'Credits',
    Icon: CreditCard,
    getPath: () => '/credits',
  },
  {
    key: 'settings',
    label: 'Instellingen',
    Icon: Settings,
    getPath: () => '/settings',
  },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { context } = useContextSwitcher();
  const { matchId } = useAppSelection();
  const orgSlug = (context.organisation as any)?.slug || '';

  return (
    <div className={styles.bar}>
      {ACTIONS.map(({ key, label, Icon, getPath, matchRequired }) => {
        if (matchRequired && !matchId) return null;
        return (
          <button
            key={key}
            className={styles.action}
            onClick={() => navigate(getPath({ orgSlug, matchId }))}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};
