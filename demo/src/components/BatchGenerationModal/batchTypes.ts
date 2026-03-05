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
  metadata?: any;
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
  zIndex: 9000,
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
  borderRadius: '16px 16px 0 0',
};

export const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--app-border, #333)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const bodyStyle: React.CSSProperties = {
  padding: '12px 16px',
  overflowY: 'auto',
  flex: 1,
  WebkitOverflowScrolling: 'touch',
};

export const footerStyle: React.CSSProperties = {
  padding: '10px 16px',
  paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
  borderTop: '1px solid var(--app-border, #333)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
};

export const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid var(--app-border, #555)',
  background: 'var(--app-surface-2, #252540)',
  color: 'var(--app-text, #e0e0e0)',
  fontSize: '13px',
  minWidth: '100px',
};

export const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--app-border, #333)',
  marginBottom: '8px',
};

export const avatarStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  objectFit: 'cover',
  background: 'var(--app-muted, #333)',
  flexShrink: 0,
};
