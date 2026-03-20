/**
 * ConnectionStatus — real-time connection status indicator (B64)
 *
 * Shows a coloured dot + label reflecting the WebSocket connection state.
 * Only renders when WebSocket is enabled via feature flag.
 */
import React from 'react';
import { useConnectionStatus, isRealtimeEnabled } from '@/hooks/useRealtimeChannel';
import type { ConnectionStatus as Status } from '@/hooks/useRealtimeChannel';
import styles from './ConnectionStatus.module.css';

const STATUS_LABELS: Record<Status, string> = {
  connected: 'Live',
  connecting: 'Verbinden...',
  reconnecting: 'Herverbinden...',
  disconnected: 'Offline',
};

export interface ConnectionStatusProps {
  /** Show label text next to the dot (default: true) */
  showLabel?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showLabel = true,
  className,
}) => {
  const status = useConnectionStatus();

  if (!isRealtimeEnabled()) return null;

  const label = STATUS_LABELS[status];

  return (
    <span
      className={`${styles.connectionStatus}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={`Verbinding: ${label}`}
    >
      <span className={`${styles.dot} ${styles[status]}`} aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  );
};
