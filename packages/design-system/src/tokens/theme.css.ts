import { colorVars } from './colors.css';
import { typographyVars } from './typography.css';
import { spacingVars } from './spacing.css';
import { radiusVars } from './radius.css';
import { shadowVars } from './shadows.css';
import { zIndexVars } from './zIndex.css';
import { motionVars } from './motion.css';

export const themeVars = {
  color: colorVars,
  typography: typographyVars,
  spacing: spacingVars,
  radius: radiusVars,
  shadow: shadowVars,
  zIndex: zIndexVars,
  motion: motionVars,
} as const;

export type ThemeVars = typeof themeVars;
