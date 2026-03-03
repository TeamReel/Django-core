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
  zIndex: 1100,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  padding: '16px',
};

export const panelStyle: CSSProperties = {
  backgroundColor: 'var(--app-surface, white)',
  padding: '24px',
  borderRadius: '12px',
  width: '700px',
  maxWidth: '100%',
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  color: 'var(--app-text)',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 32px)',
  margin: 'auto',
};

export const tabStyle = (active: boolean): CSSProperties => ({
  padding: '10px 24px',
  border: 'none',
  background: active ? 'var(--app-primary, #0b5ed7)' : 'transparent',
  color: active ? '#fff' : 'var(--app-text, #333)',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  fontSize: '14px',
  borderRadius: '8px 8px 0 0',
  transition: 'all .15s ease',
});

export const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--app-text)',
};

export const fieldWrapStyle: CSSProperties = {
  marginBottom: '16px',
};

export const errorBoxStyle: CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'rgba(220, 53, 69, 0.1)',
  color: 'var(--app-error)',
  border: '1px solid rgba(220, 53, 69, 0.3)',
  borderRadius: '6px',
  marginBottom: '16px',
  fontSize: '14px',
};

export const successBoxStyle: CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'rgba(25, 135, 84, 0.1)',
  color: '#198754',
  border: '1px solid rgba(25, 135, 84, 0.3)',
  borderRadius: '6px',
  marginBottom: '16px',
  fontSize: '14px',
};

export const userRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--app-border, #e0e0e0)',
  marginBottom: '8px',
  cursor: 'pointer',
  transition: 'background .1s',
};

/* ──────────────────────────── hierarchy description table ── */

export const LEVEL_LABEL: Record<ContextLevel, string> = {
  organisation: 'Federation',
  club: 'Club',
  team: 'Team',
};
