import { describe, it, expect } from 'vitest';
import { validateTheme } from '../../../src/validation/themeValidator';

describe('validateTheme', () => {
  it('should pass for valid theme', () => {
    const theme = {
      color: {
        text: {
          primary: '#000000',
          secondary: '#555555',
          link: '#0000EE'
        },
        background: {
          primary: '#ffffff',
          secondary: '#f5f5f5'
        },
        border: {
          primary: '#666666' // Changed from #cccccc to ensure 3:1 ratio
        },
        state: {
          error: { text: '#cc0000' },
          success: { text: '#008000' },
          warning: { text: '#ff8c00' }
        }
      }
    };

    const report = validateTheme(theme);
    if (!report.passed) {
      console.log('Errors:', report.errors);
    }
    expect(report.passed).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('should fail for low contrast text', () => {
    const theme = {
      color: {
        text: {
          primary: '#cccccc', // Low contrast on white
          secondary: '#555555',
          link: '#0000EE'
        },
        background: {
          primary: '#ffffff',
          secondary: '#f5f5f5'
        },
        border: {
          primary: '#999999'
        },
        state: {
          error: { text: '#cc0000' },
          success: { text: '#008000' },
          warning: { text: '#ff8c00' }
        }
      }
    };

    const report = validateTheme(theme);
    expect(report.passed).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);

    // Find the specific error
    const primaryTextError = report.errors.find(e => e.pair === 'Primary text on primary bg');
    expect(primaryTextError).toBeDefined();
    expect(primaryTextError?.ratio).toBeLessThan(4.5);
  });

  it('should report missing color tokens as warnings', () => {
    const theme = {
      color: {
        text: { primary: '#000000' }
        // Missing background, border, and state colors
      }
    };

    const report = validateTheme(theme);
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it('should check all critical color pairs', () => {
    const theme = {
      color: {
        text: {
          primary: '#000000',
          secondary: '#555555',
          link: '#0000EE'
        },
        background: {
          primary: '#ffffff',
          secondary: '#f5f5f5'
        },
        border: {
          primary: '#999999'
        },
        state: {
          error: { text: '#cc0000' },
          success: { text: '#008000' },
          warning: { text: '#ff8c00' }
        }
      }
    };

    const report = validateTheme(theme);
    expect(report.totalChecks).toBe(8); // Should check 8 critical pairs
  });

  it('should handle nested color structure', () => {
    const theme = {
      color: {
        text: {
          primary: '#000000',
          secondary: '#444444',
          link: '#0066cc'
        },
        background: {
          primary: '#ffffff',
          secondary: '#eeeeee'
        },
        border: {
          primary: '#666666' // Changed from #cccccc to ensure 3:1 ratio
        },
        state: {
          error: { text: '#d32f2f' },
          success: { text: '#388e3c' },
          warning: { text: '#f57c00' }
        }
      }
    };

    const report = validateTheme(theme);
    if (!report.passed) {
      console.log('Errors:', report.errors);
    }
    expect(report.passed).toBe(true);
  });

  it('should fail for multiple contrast violations', () => {
    const theme = {
      color: {
        text: {
          primary: '#cccccc',    // Low contrast
          secondary: '#dddddd',  // Low contrast
          link: '#eeeeee'        // Low contrast
        },
        background: {
          primary: '#ffffff',
          secondary: '#f5f5f5'
        },
        border: {
          primary: '#f0f0f0'     // Low contrast
        },
        state: {
          error: { text: '#ffcccc' },   // Low contrast
          success: { text: '#ccffcc' }, // Low contrast
          warning: { text: '#ffffcc' }  // Low contrast
        }
      }
    };

    const report = validateTheme(theme);
    expect(report.passed).toBe(false);
    expect(report.errors.length).toBeGreaterThan(3); // Multiple failures
  });

  it('should provide detailed error information', () => {
    const theme = {
      color: {
        text: {
          primary: '#aaaaaa', // Fails contrast
          secondary: '#555555',
          link: '#0000EE'
        },
        background: {
          primary: '#ffffff',
          secondary: '#f5f5f5'
        },
        border: {
          primary: '#999999'
        },
        state: {
          error: { text: '#cc0000' },
          success: { text: '#008000' },
          warning: { text: '#ff8c00' }
        }
      }
    };

    const report = validateTheme(theme);
    const error = report.errors[0];

    expect(error).toHaveProperty('pair');
    expect(error).toHaveProperty('foreground');
    expect(error).toHaveProperty('background');
    expect(error).toHaveProperty('ratio');
    expect(error).toHaveProperty('required');

    expect(error.foreground).toBe('#aaaaaa');
    expect(error.background).toBe('#ffffff');
    expect(error.ratio).toBeGreaterThan(0);
    expect(error.required).toBe(4.5);
  });

  it('should handle empty theme object', () => {
    const theme = {};

    const report = validateTheme(theme);
    expect(report.passed).toBe(true); // No errors, just warnings
    expect(report.warnings.length).toBe(8); // All pairs missing
  });
});
