/**
 * Shared Hooks Barrel Export
 */

export { useQueryParams } from './useQueryParams';
export { usePolling, type UsePollingOptions, type UsePollingResult } from './usePolling';
export { useApiBase } from './useApiBase';
export {
  useRealtimeChannel,
  useConnectionStatus,
  isRealtimeEnabled,
  type ConnectionStatus,
  type RealtimeEvent,
  type UseRealtimeChannelOptions,
  type UseRealtimeChannelReturn,
} from './useRealtimeChannel';

export default {
  useQueryParams: () => import('./useQueryParams').then(m => m.useQueryParams),
  usePolling: () => import('./usePolling').then(m => m.usePolling),
  useApiBase: () => import('./useApiBase').then(m => m.useApiBase),
};
