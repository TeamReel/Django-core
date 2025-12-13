/**
 * API Contract: B11 Billing & Credits System
 *
 * This file defines TypeScript interfaces for B11 (Billing & Credits) API responses.
 * These interfaces serve as contracts between F05 components and the B11 backend.
 *
 * Feature: 027-resource-display-alerts (F05)
 * Backend Dependency: B11 (Billing & Credits Management)
 * Date: 2025-12-12
 */

// ============================================================================
// Credit Usage API
// ============================================================================

/**
 * Response from GET /api/billing/usage
 *
 * Provides current credit usage, limits, and transaction history.
 */
export interface CreditUsageResponse {
  /** Credit allocation and consumption */
  credits: {
    /** Number of credits consumed */
    used: number;
    /** Maximum credit limit for current billing period */
    limit: number;
    /** Remaining credits (calculated: limit - used) */
    remaining: number;
    /** ISO 8601 timestamp when credits reset (start of next billing period) */
    resetAt: string;
  };
  /** Recent credit transactions (optional, may be paginated separately) */
  transactions?: CreditTransaction[];
  /** Metadata about the response */
  meta?: {
    /** ISO 8601 timestamp of when data was generated */
    generatedAt: string;
    /** Billing period identifier (e.g., "2025-12") */
    period: string;
  };
}

/**
 * Individual credit transaction record
 */
export interface CreditTransaction {
  /** Unique transaction identifier */
  id: string;
  /** Credit amount (positive for consumption, negative for refunds) */
  amount: number;
  /** Human-readable description of transaction */
  description: string;
  /** ISO 8601 timestamp of transaction */
  timestamp: string;
  /** Optional transaction category (e.g., "api", "storage", "compute") */
  category?: string;
  /** Optional reference to related resource (e.g., project ID, API endpoint) */
  resourceRef?: string;
}

// ============================================================================
// Credit Plans API (Optional - for upgrade prompts)
// ============================================================================

/**
 * Response from GET /api/billing/plans
 *
 * Lists available credit plans for upgrade prompts.
 */
export interface CreditPlansResponse {
  plans: CreditPlan[];
}

/**
 * Credit plan details
 */
export interface CreditPlan {
  /** Plan identifier */
  id: string;
  /** Plan display name (e.g., "Starter", "Professional", "Enterprise") */
  name: string;
  /** Monthly credit allocation */
  credits: number;
  /** Price in cents (e.g., 1999 = $19.99) */
  priceInCents: number;
  /** Currency code (ISO 4217, e.g., "USD") */
  currency: string;
  /** Plan features/benefits */
  features: string[];
  /** Whether this is the recommended plan */
  recommended?: boolean;
}

// ============================================================================
// Normalization Utilities (for F05 components)
// ============================================================================

/**
 * Normalize B11 CreditUsageResponse to F05 ResourceUsageData format
 *
 * @example
 * ```typescript
 * const apiResponse = await fetch('/api/billing/usage').then(r => r.json());
 * const resourceData = normalizeCreditUsage(apiResponse);
 *
 * // Pass to ResourceUsageBar component
 * <ResourceUsageBar
 *   value={resourceData.value}
 *   max={resourceData.max}
 *   label={resourceData.label}
 * />
 * ```
 */
export function normalizeCreditUsage(response: CreditUsageResponse): {
  value: number;
  max: number;
  label: string;
  unit: string;
  lastUpdated: string;
} {
  return {
    value: response.credits.used,
    max: response.credits.limit,
    label: 'API Credits',
    unit: 'credits',
    lastUpdated: response.meta?.generatedAt ?? new Date().toISOString(),
  };
}

/**
 * Calculate usage percentage from credit data
 *
 * @returns Percentage (0-100)
 */
export function calculateCreditUsagePercentage(response: CreditUsageResponse): number {
  const { used, limit } = response.credits;
  if (limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Determine severity level based on credit usage percentage
 *
 * @returns 'low' (0-50%), 'medium' (50-80%), or 'high' (80-100%)
 */
export function calculateCreditSeverity(
  response: CreditUsageResponse
): 'low' | 'medium' | 'high' {
  const percentage = calculateCreditUsagePercentage(response);
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to validate CreditUsageResponse structure
 */
export function isCreditUsageResponse(data: unknown): data is CreditUsageResponse {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  // Check credits object
  if (!obj.credits || typeof obj.credits !== 'object') return false;
  const credits = obj.credits as Record<string, unknown>;

  return (
    typeof credits.used === 'number' &&
    typeof credits.limit === 'number' &&
    typeof credits.remaining === 'number' &&
    typeof credits.resetAt === 'string'
  );
}

// ============================================================================
// Mock Data (for testing/Storybook)
// ============================================================================

/**
 * Mock credit usage response for testing
 */
export const mockCreditUsageResponse: CreditUsageResponse = {
  credits: {
    used: 850,
    limit: 1000,
    remaining: 150,
    resetAt: '2025-01-01T00:00:00Z',
  },
  transactions: [
    {
      id: 'txn_001',
      amount: 25,
      description: 'API requests to /v1/users',
      timestamp: '2025-12-12T14:30:00Z',
      category: 'api',
    },
    {
      id: 'txn_002',
      amount: 50,
      description: 'Data export (CSV)',
      timestamp: '2025-12-12T10:15:00Z',
      category: 'export',
    },
  ],
  meta: {
    generatedAt: '2025-12-12T15:00:00Z',
    period: '2025-12',
  },
};

/**
 * Mock credit usage at critical threshold (95%)
 */
export const mockCriticalCreditUsage: CreditUsageResponse = {
  credits: {
    used: 950,
    limit: 1000,
    remaining: 50,
    resetAt: '2025-01-01T00:00:00Z',
  },
  meta: {
    generatedAt: '2025-12-12T15:00:00Z',
    period: '2025-12',
  },
};

/**
 * Mock credit usage at low threshold (20%)
 */
export const mockLowCreditUsage: CreditUsageResponse = {
  credits: {
    used: 200,
    limit: 1000,
    remaining: 800,
    resetAt: '2025-01-01T00:00:00Z',
  },
  meta: {
    generatedAt: '2025-12-12T15:00:00Z',
    period: '2025-12',
  },
};
