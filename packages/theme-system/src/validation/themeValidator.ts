import { checkContrast } from './contrast';

export interface ValidationError {
  pair: string;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
}

export interface ValidationReport {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  totalChecks: number;
}

export function validateTheme(theme: Record<string, unknown>): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Critical pairs (must pass AA)
  const criticalPairs = [
    { name: 'Primary text on primary bg', fg: 'color.text.primary', bg: 'color.background.primary' },
    { name: 'Secondary text on primary bg', fg: 'color.text.secondary', bg: 'color.background.primary' },
    { name: 'Link on primary bg', fg: 'color.text.link', bg: 'color.background.primary' },
    { name: 'Primary text on secondary bg', fg: 'color.text.primary', bg: 'color.background.secondary' },
    { name: 'Border on primary bg', fg: 'color.border.primary', bg: 'color.background.primary' },
    { name: 'Error text on primary bg', fg: 'color.state.error.text', bg: 'color.background.primary' },
    { name: 'Success text on primary bg', fg: 'color.state.success.text', bg: 'color.background.primary' },
    { name: 'Warning text on primary bg', fg: 'color.state.warning.text', bg: 'color.background.primary' }
  ];

  criticalPairs.forEach(({ name, fg, bg }) => {
    const fgColor = getNestedValue(theme, fg);
    const bgColor = getNestedValue(theme, bg);

    if (!fgColor || !bgColor) {
      warnings.push({
        pair: name,
        foreground: fgColor || 'undefined',
        background: bgColor || 'undefined',
        ratio: 0,
        required: 4.5
      });
      return;
    }

    // Use 'large' text size for borders (3:1 ratio for UI components)
    // Text elements use 'normal' size (4.5:1 ratio for AA compliance)
    const isBorder = name.includes('Border');
    const textSize = isBorder ? 'large' : 'normal';

    try {
      const result = checkContrast(fgColor, bgColor, 'AA', textSize);

      if (!result.passes) {
        errors.push({
          pair: name,
          foreground: fgColor,
          background: bgColor,
          ratio: result.ratio,
          required: result.required
        });
      }
    } catch {
      // If color parsing fails, treat as error
      errors.push({
        pair: name,
        foreground: fgColor,
        background: bgColor,
        ratio: 0,
        required: textSize === 'large' ? 3 : 4.5
      });
    }
  });

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    totalChecks: criticalPairs.length
  };
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string | undefined;
}
