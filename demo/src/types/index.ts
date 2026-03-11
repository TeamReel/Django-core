/**
 * Shared Type Definitions for Demo Shell
 *
 * Types for API responses, entities, and domain models.
 * Aligned with B05-B15 backend contracts.
 */

// Core business entities
export type {
  User,
  Organisation,
  Project,
  AuditEvent,
  Period,
  Activity,
  Permission,
  Role,
  RoleAssignment,
} from './entities';

// Platform, observability, and generic API helpers
export type {
  HealthStatus,
  ObservabilityMetrics,
  FeatureFlag,
  CreditTransaction,
  ApiResponse,
  ListResponse,
  ErrorResponse,
  RequestState,
  PaginationParams,
  FilterParams,
  TenancyContext,
} from './platform';
