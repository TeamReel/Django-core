// @django-core/design-system
// Product-agnostic design system foundation

// Theme
export { ThemeProvider, useTheme } from './theme';
export { lightTheme, darkTheme } from './theme/themes';
export type { ThemeMode } from './theme/ThemeContext';

// Re-export design tokens
export * from './tokens';

// Form Components
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './components/Button';
export { Input, type InputProps, type InputState, type InputSize } from './components/Input';
export { Textarea, type TextareaProps, type TextareaState, type TextareaSize, type TextareaResize } from './components/Textarea';
export { Checkbox, type CheckboxProps, type CheckboxState, type CheckboxSize } from './components/Checkbox';
export { Radio, RadioGroup, type RadioProps, type RadioGroupProps, type RadioState, type RadioSize } from './components/Radio';

// Data Display Components
export { Card, type CardProps } from './components/Card';
export { Badge, type BadgeProps, type BadgeVariant, type BadgeSize } from './components/Badge';
export { Progress, type ProgressProps, type ProgressSize } from './components/Progress';

// Feedback Components
export { Alert, type AlertProps, type AlertVariant } from './components/Alert';
export { Spinner, type SpinnerProps, type SpinnerSize } from './components/Spinner';

// Typography Components
export { Heading, type HeadingProps, type HeadingLevel, type HeadingSize, type HeadingWeight } from './components/Heading';
export { Text, type TextProps, type TextSize, type TextWeight, type TextColor } from './components/Text';

// Layout Components
export { Stack, type StackProps, type StackDirection, type StackAlign, type StackJustify } from './components/Stack';
export { Grid, type GridProps } from './components/Grid';
export { Container, type ContainerProps, type ContainerSize } from './components/Container';

// Interaction Components
export { Modal, type ModalProps } from './components/Modal';
export { Select, SelectOption, type SelectProps, type SelectOptionType } from './components/Select';
export { Tabs, TabList, Tab, TabPanel, type TabsProps, type TabListProps, type TabProps, type TabPanelProps } from './components/Tabs';
export { Tooltip, type TooltipProps } from './components/Tooltip';
