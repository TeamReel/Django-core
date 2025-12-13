/**
 * Utility functions for ResourceUsageBar component
 */

export type Severity = 'low' | 'medium' | 'high';

/**
 * Calculate percentage from value and max
 * @param value - Current usage value
 * @param max - Maximum value
 * @returns Percentage (0-100+, can exceed 100 for over-quota scenarios)
 */
export const calculatePercentage = (value: number, max: number): number => {
  if (max === 0) return 0; // Avoid division by zero
  return (value / max) * 100;
};

/**
 * Map percentage to severity level
 * - 0-50%: low (green)
 * - 50-80%: medium (yellow)
 * - 80-100%+: high (red)
 * @param percentage - Usage percentage
 * @returns Severity level
 */
export const getSeverity = (percentage: number): Severity => {
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
};

/**
 * Format display text based on options
 * @param value - Current usage value
 * @param max - Maximum value
 * @param unit - Optional unit label (e.g., "credits", "GB")
 * @param showPercentage - Whether to show percentage instead of value/max
 * @returns Formatted display text
 */
export const formatDisplayText = (
  value: number,
  max: number,
  unit?: string,
  showPercentage?: boolean
): string => {
  if (showPercentage) {
    const percentage = calculatePercentage(value, max);
    return `${Math.round(percentage)}%`;
  }

  return `${value}/${max}${unit ? ` ${unit}` : ''}`;
};

/**
 * Get color value for severity level
 * Returns F01 design system color token values
 * @param severity - Severity level
 * @returns Color string (CSS custom property or fallback hex)
 */
export const getSeverityColor = (severity: Severity): string => {
  switch (severity) {
    case 'low':
      return 'var(--color-success-500, #22c55e)'; // Green
    case 'medium':
      return 'var(--color-warning-500, #f59e0b)'; // Yellow
    case 'high':
      return 'var(--color-error-500, #ef4444)'; // Red
  }
};
