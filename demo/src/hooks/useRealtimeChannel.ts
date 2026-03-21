/**
 * useRealtimeChannel — WebSocket hook for real-time content updates (B64)
 *
 * Manages a shared WebSocket connection to /ws/content-updates/ with:
 * - Channel subscriptions (project:{id}, content:{id})
 * - Auto-reconnect with exponential backoff (1s → 30s)
 * - Feature flag gating (VITE_REALTIME_WS_ENABLED)
 * - Connection status tracking
 *
 * Usage:
 *   const { status } = useRealtimeChannel({
 *     channelType: 'project',
 *     channelId: projectId,
 *     onEvent: (event) => { ... },
 *   });
 */
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/utils/apiFetch';
import { getApiBaseUrl } from '@/utils/apiBase';
import { logger } from '@/utils/logger';

// ============================================================================
// Types
// ============================================================================

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface RealtimeEvent {
  event_type: string;
  data: Record<string, unknown>;
  timestamp: string;
  actor_id?: string | null;
  event_id: string;
}

// ============================================================================
// Feature flag
// ============================================================================

export function isRealtimeEnabled(): boolean {
  const flag = import.meta.env.VITE_REALTIME_WS_ENABLED;
  if (flag === 'false' || flag === '0' || flag === false) return false;
  return true;
}

// ============================================================================
// RealtimeConnection — singleton WebSocket manager
// ============================================================================

type EventCallback = (event: RealtimeEvent) => void;
type StatusCallback = (status: ConnectionStatus) => void;

const MIN_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 30_000;

class RealtimeConnection {
  private ws: WebSocket | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private subscriptions = new Map<string, Set<EventCallback>>();
  private statusListeners = new Set<StatusCallback>();
  private reconnectDelay = MIN_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private alive = false;
  private connecting = false;

  get status(): ConnectionStatus {
    return this._status;
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this._status === newStatus) return;
    this._status = newStatus;
    this.statusListeners.forEach(cb => cb(newStatus));
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  /**
   * Ensure connection is active. Called when a new subscription is added.
   * No-op if already connected or connecting.
   */
  async ensureConnected(): Promise<void> {
    if (this._status === 'connected' && this.ws?.readyState === WebSocket.OPEN) return;
    if (this.connecting) return;
    await this.connect();
  }

  private async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    this.alive = true;
    this.setStatus(this._status === 'disconnected' ? 'connecting' : 'reconnecting');

    try {
      const tokenResponse = await apiFetch('/api/ws/token/');
      if (!tokenResponse.ok) {
        logger.error('Realtime: Failed to get WS token', tokenResponse.status);
        this.connecting = false;
        this.scheduleReconnect();
        return;
      }
      const { token } = await tokenResponse.json();
      if (!this.alive) { this.connecting = false; return; }

      const baseUrl = getApiBaseUrl();
      const wsBase = baseUrl ? baseUrl.replace(/^http/, 'ws') : `ws://${window.location.host}`;
      const wsUrl = `${wsBase}/ws/content-updates/?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectDelay = MIN_RECONNECT_DELAY;
        // Re-subscribe all active channels
        for (const channel of this.subscriptions.keys()) {
          this.sendMessage({ action: 'subscribe', channel });
        }
      };

      ws.onmessage = (msgEvent) => {
        try {
          const data = JSON.parse(msgEvent.data);
          this.handleMessage(data);
        } catch (e) {
          logger.error('Realtime: Failed to parse message', e);
        }
      };

      ws.onclose = () => {
        this.ws = null;
        this.connecting = false;
        if (this.alive && this.subscriptions.size > 0) {
          this.setStatus('reconnecting');
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };

      ws.onerror = (err) => {
        logger.error('Realtime: WebSocket error', err);
      };

      this.ws = ws;
      this.connecting = false;
    } catch (e) {
      logger.error('Realtime: Connection failed', e);
      this.connecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (!this.alive || this.subscriptions.size === 0) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
      this.connect();
    }, this.reconnectDelay);
  }

  private sendMessage(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(data: Record<string, unknown>) {
    const msgType = data.type as string | undefined;

    // Skip system messages
    if (msgType === 'pong' || msgType === 'connected' || msgType === 'subscribed' || msgType === 'unsubscribed') {
      return;
    }

    if (msgType === 'error') {
      logger.error('Realtime: Server error', data.message);
      return;
    }

    // Build normalised event from either new-style or legacy format
    const event: RealtimeEvent = {
      event_type: (data.event_type || msgType || 'unknown') as string,
      data: (data.data || data.payload || data) as Record<string, unknown>,
      timestamp: (data.timestamp as string) || new Date().toISOString(),
      actor_id: (data.actor_id as string | null) ?? null,
      event_id: (data.event_id as string) || '',
    };

    // Dispatch to all subscriber callbacks
    for (const callbacks of this.subscriptions.values()) {
      callbacks.forEach(cb => {
        try { cb(event); } catch (e) { logger.error('Realtime: Event callback error', e); }
      });
    }

    // Dispatch global window event for queue badge updates
    const QUEUE_EVENT_TYPES = new Set([
      'content.status_changed', 'content.approved', 'content.rejected',
      'approval.requested', 'approval.decided',
      'video.completed', 'generation.status_changed',
    ]);
    if (QUEUE_EVENT_TYPES.has(event.event_type)) {
      window.dispatchEvent(new CustomEvent('teamreel:queue-update', { detail: { source: 'realtime' } }));
    }
  }

  /**
   * Subscribe to a channel. Returns an unsubscribe function.
   */
  subscribe(channel: string, callback: EventCallback): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    const channelSubs = this.subscriptions.get(channel)!;
    const isNewChannel = channelSubs.size === 0;
    channelSubs.add(callback);

    if (isNewChannel) {
      if (this._status === 'connected') {
        this.sendMessage({ action: 'subscribe', channel });
      } else {
        this.ensureConnected();
      }
    }

    return () => {
      channelSubs.delete(callback);
      if (channelSubs.size === 0) {
        this.subscriptions.delete(channel);
        this.sendMessage({ action: 'unsubscribe', channel });

        // Disconnect when no subscriptions remain
        if (this.subscriptions.size === 0) {
          this.teardown();
        }
      }
    };
  }

  private teardown() {
    this.alive = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connecting = false;
    this.setStatus('disconnected');
    this.reconnectDelay = MIN_RECONNECT_DELAY;
  }
}

// Singleton — shared across all hook instances
const realtimeConnection = new RealtimeConnection();

// ============================================================================
// Hook: useRealtimeChannel
// ============================================================================

export interface UseRealtimeChannelOptions {
  channelType: 'project' | 'content' | 'user';
  channelId: string | number | null;
  /** Disable WS for this hook instance (default: true) */
  enabled?: boolean;
  /** Called for every incoming event */
  onEvent?: (event: RealtimeEvent) => void;
}

export interface UseRealtimeChannelReturn {
  status: ConnectionStatus;
  lastEvent: RealtimeEvent | null;
}

export function useRealtimeChannel(options: UseRealtimeChannelOptions): UseRealtimeChannelReturn {
  const { channelType, channelId, enabled = true, onEvent } = options;

  const [status, setStatus] = useState<ConnectionStatus>(() => realtimeConnection.status);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const wsEnabled = isRealtimeEnabled() && enabled;
  const channel = channelId != null ? `${channelType}:${channelId}` : null;

  // Track connection status
  useEffect(() => {
    return realtimeConnection.onStatusChange(setStatus);
  }, []);

  // Subscribe / unsubscribe
  useEffect(() => {
    if (!wsEnabled || !channel) return;

    const handleEvent = (event: RealtimeEvent) => {
      setLastEvent(event);
      onEventRef.current?.(event);
    };

    return realtimeConnection.subscribe(channel, handleEvent);
  }, [wsEnabled, channel]);

  return { status, lastEvent };
}

// ============================================================================
// Hook: useConnectionStatus — lightweight status-only hook
// ============================================================================

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(() => realtimeConnection.status);

  useEffect(() => {
    return realtimeConnection.onStatusChange(setStatus);
  }, []);

  return status;
}
