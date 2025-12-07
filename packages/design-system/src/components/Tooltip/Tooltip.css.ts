import { style } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

export const tooltip = style({
  backgroundColor: themeVars.color.palette.neutral['900'],
  color: themeVars.color.text.inverse,
  padding: `${themeVars.spacing['2']} ${themeVars.spacing['3']}`,
  borderRadius: themeVars.radius.sm,
  fontSize: themeVars.typography.fontSize.sm,
  maxWidth: '250px',
  wordWrap: 'break-word',
  zIndex: 9999,
  boxShadow: themeVars.shadow.md,
});
