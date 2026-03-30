export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string | string[];
  backgroundColor?: string | string[];
  fill?: boolean;
  tension?: number;
  pointBackgroundColor?: string | string[];
  pointBorderColor?: string | string[];
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins?: {
    legend?: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    title?: {
      display: boolean;
      text?: string;
    };
  };
  scales?: {
    x?: {
      display: boolean;
      grid?: {
        display: boolean;
      };
    };
    y?: {
      display: boolean;
      beginAtZero?: boolean;
      grid?: {
        display: boolean;
      };
    };
  };
}

export interface CreditsTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'usage' | 'purchase' | 'refund';
  description: string;
}

export interface ObservabilityMetrics {
  timestamp: number;
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  activeConnections: number;
}

/**
 * Theme-aware color utilities for charts
 */
export const getThemeColors = () => {
  // Get CSS custom properties from F07 theme system
  const style = getComputedStyle(document.documentElement);

  return {
    primary: style.getPropertyValue('--color-accent-500') || '#3b82f6',
    success: style.getPropertyValue('--color-success-500') || '#10b981',
    warning: style.getPropertyValue('--color-warning-500') || '#f59e0b',
    error: style.getPropertyValue('--color-error-500') || '#ef4444',
    text: style.getPropertyValue('--color-text-primary') || '#1f2937',
    textSecondary: style.getPropertyValue('--color-text-secondary') || '#6b7280',
    border: style.getPropertyValue('--color-border-subtle') || '#e5e7eb',
    background: style.getPropertyValue('--color-background-surface') || '#ffffff',
  };
};
