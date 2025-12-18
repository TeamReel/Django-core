// @django-core/design-system
// Product-agnostic design system foundation

// Theme
export { ThemeProvider, useTheme } from './theme';
export { lightTheme, darkTheme } from './theme';
export type { ThemeMode } from './theme';

// Re-export design tokens
export * from './tokens';

// Form Components
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './components/Button';
export { Input, type InputProps, type InputState, type InputSize } from './components/Input';
export { Textarea, type TextareaProps, type TextareaState, type TextareaSize, type TextareaResize } from './components/Textarea';
export { Checkbox, type CheckboxProps, type CheckboxState, type CheckboxSize } from './components/Checkbox';
export { Radio, RadioGroup, type RadioProps, type RadioGroupProps, type RadioState, type RadioSize } from './components/Radio';
export { FileUpload, type FileUploadProps, type FileUploadFile } from './components/FileUpload';

// Data Display Components
export { Card, type CardProps } from './components/Card';
export { Badge, type BadgeProps } from './components/Badge';
export type { BadgeVariant, BadgeSize } from './components/Badge/Badge.css';
export { Progress, type ProgressProps } from './components/Progress';
export type { ProgressSize } from './components/Progress/Progress.css';

// Feedback Components
export { Alert, type AlertProps } from './components/Alert';
export type { AlertVariant } from './components/Alert/Alert.css';
export { Spinner, type SpinnerProps } from './components/Spinner';
export type { SpinnerSize } from './components/Spinner/Spinner.css';

// Typography Components
export { Heading, type HeadingProps } from './components/Heading';
export type { HeadingLevel } from './components/Heading/Heading.css';
export { Text, type TextProps } from './components/Text';
export type { TextSize, TextWeight, TextColor } from './components/Text/Text.css';

// Layout Components
export { Stack, type StackProps } from './components/Stack';
export { Grid, type GridProps } from './components/Grid';
export { Container, type ContainerProps } from './components/Container';
export type { ContainerMaxWidth as ContainerSize } from './components/Container/Container.css';

// Interaction Components
export { Modal, type ModalProps } from './components/Modal';
export { Select, SelectOption, type SelectProps, type SelectOptionType } from './components/Select';
export { Tabs, TabList, Tab, TabPanel, type TabsProps, type TabListProps, type TabProps, type TabPanelProps } from './components/Tabs';
export { Tooltip, type TooltipProps } from './components/Tooltip';
