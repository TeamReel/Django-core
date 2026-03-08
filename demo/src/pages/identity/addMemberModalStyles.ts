/**
 * Styles, types, and constants for AddMemberModal.
 *
 * Extracted to keep the main component under 500 lines.
 */

import type { CSSProperties } from 'react';

/* ──────────────────────────────────────────────────────── types ── */

export type ContextLevel = 'organisation' | 'club' | 'team';

export interface UserResult {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

/* ──────────────────────────────────────────────────────── styles ── */

export const overlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 'var(--z-toast)',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  padding: 'var(--space-4)',
};

export const panelStyle: CSSProperties = {
  backgroundColor: 'var(--app-surface, white)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  width: '700px',
  maxWidth: '100%',
  boxShadow: 'var(--shadow-lg)',
  color: 'var(--app-text)',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 32px)',
  margin: 'auto',
};

export const tabStyle = (active: boolean): CSSProperties => ({
  padding: 'var(--space-3) var(--space-6)',
  border: 'none',
  background: active ? 'var(--app-primary, #0b5ed7)' : 'transparent',
  color: active ? 'var(--color-white, #fff)' : 'var(--app-text, #333)',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  fontSize: 'var(--text-sm)',
  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
  transition: 'all .15s ease',
});

export const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-1)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-medium)',
  color: 'var(--app-text)',
};

export const fieldWrapStyle: CSSProperties = {
  marginBottom: 'var(--space-4)',
};

export const errorBoxStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  backgroundColor: 'rgba(220, 53, 69, 0.1)',
  color: 'var(--app-error)',
  border: '1px solid rgba(220, 53, 69, 0.3)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--space-4)',
  fontSize: 'var(--text-sm)',
};

export const successBoxStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  backgroundColor: 'rgba(25, 135, 84, 0.1)',
  color: 'var(--color-green-600)',
  border: '1px solid rgba(25, 135, 84, 0.3)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--space-4)',
  fontSize: 'var(--text-sm)',
};

export const userRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--space-3) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--app-border, #e0e0e0)',
  marginBottom: 'var(--space-2)',
  cursor: 'pointer',
  transition: 'background .1s',
};

/* ──────────────────────────── hierarchy description table ── */

export const LEVEL_LABEL: Record<ContextLevel, string> = {
  organisation: 'Federation',
  club: 'Club',
  team: 'Team',
};
