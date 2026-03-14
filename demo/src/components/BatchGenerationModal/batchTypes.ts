/**
 * Batch Generation — shared types and style constants.
 */
import type React from 'react';

// ── Types ────────────────────────────────────────────────────────────

export interface BatchMember {
  id: string; // membership ID
  name: string;
  profilePhotoUrl: string | null;
  /** Per-kit-type fullbody URLs (e.g. { home: "s3://...", away: "..." }) */
  fullbodyUrls: Record<string, string>;
  /** Per-kit-type closeup URLs */
  closeupUrls: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface MemberParams {
  [paramKey: string]: string;
}

export type BatchStatus = 'idle' | 'running' | 'done';

export interface MemberJobStatus {
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  error?: string;
  resultUrl?: string;
  progressFrames?: number;
  totalFrames?: number;
}

export interface BatchGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: BatchMember[];
  projectId: string;
  organisationId: string;
  /** Brand profile assets (logo, sponsor URLs) */
  brandAssets: {
    logo?: string | null;
    sponsor?: string | null;
    kits: Record<string, string | null>;
  };
  /** Callback when batch completes (to refresh data) */
  onBatchComplete?: () => void;
}

// ── Style constants ──────────────────────────────────────────────────

export const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 'var(--z-max)',
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'flex-end',       /* bottom sheet on mobile, center on desktop via CSS */
  justifyContent: 'center',
  padding: '0',
};

export const modalStyle: React.CSSProperties = {
  background: 'var(--app-surface, #1a1a2e)',
  width: '100%',
  maxWidth: '900px',
  maxHeight: '95dvh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
  border: '1px solid var(--app-border, #333)',
  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
};

export const headerStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  borderBottom: '1px solid var(--app-border, #333)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const bodyStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  overflowY: 'auto',
  flex: 1,
  WebkitOverflowScrolling: 'touch',
};

export const footerStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
  borderTop: '1px solid var(--app-border, #333)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
};

export const selectStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--app-border, #555)',
  background: 'var(--app-surface-2, #252540)',
  color: 'var(--app-text, #e0e0e0)',
  fontSize: 'var(--text-sm)',
  minWidth: '100px',
};

export const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-3) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--app-border, #333)',
  marginBottom: 'var(--space-2)',
};

export const avatarStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  objectFit: 'cover',
  background: 'var(--app-muted, #333)',
  flexShrink: 0,
};
