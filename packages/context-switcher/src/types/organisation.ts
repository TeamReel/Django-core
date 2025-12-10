/**
 * Organisation entity type.
 * Represents a tenant/client/account in the multi-tenancy system.
 *
 * @packageDocumentation
 */

/**
 * Organisation entity.
 * The primary tenant-level container in the multi-tenancy system.
 */
export interface Organisation {
  /** Unique identifier (backend primary key) */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** URL-safe slug for routing (e.g., "acme-corp") */
  slug: string;

  /** Optional logo/avatar URL */
  logo?: string;

  /** Optional metadata for sorting/filtering */
  metadata?: OrganisationMetadata;
}

/**
 * Optional metadata for organisations.
 */
export interface OrganisationMetadata {
  /** Whether this organisation is pinned for quick access */
  isPinned?: boolean;

  /** Last time this organisation was visited (ISO 8601 timestamp) */
  lastVisitedAt?: string;

  /** Additional custom metadata */
  [key: string]: unknown;
}
