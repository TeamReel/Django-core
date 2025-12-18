import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

const baseStyles = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: themeVars.radius.md,
  border: `2px dashed ${themeVars.color.border.secondary}`,
  backgroundColor: themeVars.color.background.primary,
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  minHeight: '120px',
  padding: themeVars.spacing['6'],

  ':hover': {
    borderColor: themeVars.color.border.primary,
    backgroundColor: themeVars.color.background.secondary,
  },

  ':focus-visible': {
    outline: `2px solid ${themeVars.color.border.focus}`,
    outlineOffset: '2px',
  },
});

const dragOverStyles = style({
  borderColor: themeVars.color.border.focus,
  backgroundColor: themeVars.color.background.secondary,
  transform: 'scale(1.02)',
});

const disabledStyles = style({
  opacity: 0.6,
  cursor: 'not-allowed',

  ':hover': {
    borderColor: themeVars.color.border.secondary,
    backgroundColor: themeVars.color.background.primary,
  },
});

const errorStyles = style({
  borderColor: themeVars.color.border.error,
  backgroundColor: themeVars.color.background.error,
});

export const fileUploadContainer = recipe({
  base: baseStyles,
  variants: {
    state: {
      idle: {},
      dragOver: dragOverStyles,
      error: errorStyles,
      disabled: disabledStyles,
    },
  },
  defaultVariants: {
    state: 'idle',
  },
});

export const fileUploadInput = style({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',

  ':disabled': {
    cursor: 'not-allowed',
  },
});

export const fileUploadContent = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: themeVars.spacing['4'],
  textAlign: 'center',
  pointerEvents: 'none',
});

export const fileUploadIcon = style({
  width: '48px',
  height: '48px',
  color: themeVars.color.text.secondary,
});

export const fileUploadText = style({
  fontSize: themeVars.typography.fontSize.md,
  color: themeVars.color.text.primary,
  fontWeight: themeVars.typography.fontWeight.medium,
});

export const fileUploadHint = style({
  fontSize: themeVars.typography.fontSize.sm,
  color: themeVars.color.text.secondary,
});

export const fileUploadProgress = style({
  width: '100%',
  marginTop: themeVars.spacing['4'],
});

export const fileList = style({
  marginTop: themeVars.spacing['6'],
  width: '100%',
});

export const fileItem = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: themeVars.spacing['3'],
  borderRadius: themeVars.radius.sm,
  backgroundColor: themeVars.color.background.secondary,
  border: `1px solid ${themeVars.color.border.secondary}`,
  marginBottom: themeVars.spacing['2'],
});

export const fileName = style({
  fontSize: themeVars.typography.fontSize.sm,
  color: themeVars.color.text.primary,
  fontWeight: themeVars.typography.fontWeight.medium,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '200px',
});

export const fileSize = style({
  fontSize: themeVars.typography.fontSize.xs,
  color: themeVars.color.text.secondary,
  marginLeft: themeVars.spacing['2'],
});

export const fileStatus = style({
  fontSize: themeVars.typography.fontSize.xs,
  fontWeight: themeVars.typography.fontWeight.medium,
});

export const fileStatusSuccess = style([
  fileStatus,
  {
    color: themeVars.color.text.success,
  },
]);

export const fileStatusError = style([
  fileStatus,
  {
    color: themeVars.color.text.error,
  },
]);

export const fileStatusUploading = style([
  fileStatus,
  {
    color: themeVars.color.text.secondary,
  },
]);
