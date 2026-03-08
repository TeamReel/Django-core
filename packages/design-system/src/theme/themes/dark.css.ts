import { createTheme } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

export const darkTheme = createTheme(themeVars, {
  color: {
    text: {
      primary: '#EDF6FF',     // Ice White
      secondary: '#94a3b8',
      tertiary: '#64748b',
      disabled: '#475569',
      inverse: '#0A192F',     // Midnight Navy
      link: '#4CA1FF',        // Sky Blue
      error: '#f87171',
      success: '#4ade80',
      warning: '#fbbf24',
    },
    background: {
      primary: '#1C355E',     // Deep Navy — Surface 1 (Cards, Modals)
      secondary: '#243f6e',   // Surface 2 (Filled Cards, Inputs)
      tertiary: '#2e4a6d',    // Surface 3 (Hover states)
      inverse: '#EDF6FF',     // Ice White
      overlay: 'rgba(0, 0, 0, 0.75)',
      success: '#14532d',
      warning: '#422006',
      error: '#450a0a',
      info: 'rgba(76, 161, 255, 0.22)',
    },
    border: {
      primary: '#2e4a6d',
      secondary: 'rgba(148, 163, 184, 0.22)',
      focus: '#4CA1FF',       // Sky Blue
      error: '#f87171',
    },
    interactive: {
      primary: '#4CA1FF',         // Sky Blue (lighter primary for dark mode)
      primaryHover: '#6DB8FF',    // Lighter Sky Blue
      primaryActive: '#3B8EA5',   // Ocean Teal
      secondary: '#243f6e',       // Deep Navy secondary
      secondaryHover: '#2e4a6d',
      secondaryActive: '#37567c',
      destructive: '#E63946',     // Signal Red
      destructiveHover: '#f87171',
      destructiveActive: '#C62D39',
      disabled: '#2e4a6d',
    },
    palette: {
      neutral: {
        '50': '#fafafa',
        '100': '#f5f5f5',
        '200': '#e5e5e5',
        '300': '#d4d4d4',
        '400': '#a3a3a3',
        '500': '#737373',
        '600': '#525252',
        '700': '#404040',
        '800': '#262626',
        '900': '#171717',
        '950': '#0a0a0a',
      },
      primary: {
        '50': '#EDF8FB',
        '100': '#D5EFF6',
        '200': '#A8DDE9',
        '300': '#76C5D8',
        '400': '#51AABD',
        '500': '#3B8EA5',     // Ocean Teal (brand base)
        '600': '#2D7189',
        '700': '#246074',
        '800': '#1C4F5F',
        '900': '#153D49',
        '950': '#0D262E',
      },
      success: {
        '50': '#ECFDF5',
        '100': '#D1FAE5',
        '200': '#A7F3D0',
        '300': '#6EE7B7',
        '400': '#34D399',
        '500': '#06D6A0',     // Team Green
        '600': '#059669',
        '700': '#047857',
        '800': '#065F46',
        '900': '#064E3B',
        '950': '#022C22',
      },
      warning: {
        '50': '#FFFBEB',
        '100': '#FEF3C7',
        '200': '#FDE68A',
        '300': '#FCD34D',
        '400': '#FFD166',     // Focus Amber
        '500': '#F59E0B',
        '600': '#D97706',
        '700': '#B45309',
        '800': '#92400E',
        '900': '#78350F',
        '950': '#422006',
      },
      error: {
        '50': '#FEF2F2',
        '100': '#FEE2E2',
        '200': '#FECACA',
        '300': '#FCA5A5',
        '400': '#F87171',
        '500': '#E63946',     // Signal Red
        '600': '#C62D39',
        '700': '#A8242F',
        '800': '#8B1C26',
        '900': '#6D151E',
        '950': '#450A0A',
      },
    },
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    '0': '0px',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
    '20': '80px',
    '24': '96px',
  },
  radius: {
    none: '0px',
    sm: '4px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.2)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.2)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
  },
  zIndex: {
    base: '0',
    dropdown: '100',
    sticky: '200',
    modal: '300',
    popover: '400',
    tooltip: '500',
  },
  motion: {
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      default: 'ease',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out',
    },
  },
});
