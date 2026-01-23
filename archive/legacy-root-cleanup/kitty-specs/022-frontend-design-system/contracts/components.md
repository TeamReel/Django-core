# Component API Contracts
*Path: [kitty-specs/022-frontend-design-system/contracts/components.md](kitty-specs/022-frontend-design-system/contracts/components.md)*

**Feature Branch**: `022-frontend-design-system`
**Date**: 2025-12-05

## Overview

This document defines the public API contracts for all F01 design system components. These contracts serve as the source of truth for implementation and testing.

---

## Core Components

### Button

```typescript
interface ButtonProps {
  /** Visual style variant */
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** Size preset */
  size: 'sm' | 'md' | 'lg';
  /** Disable interaction */
  disabled?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon before label */
  leftIcon?: React.ReactNode;
  /** Icon after label */
  rightIcon?: React.ReactNode;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

// Ref forwarding
const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;
```

**Accessibility**:
- MUST have visible focus indicator
- MUST announce loading state to screen readers
- MUST disable click when `loading` or `disabled`

---

### Input

```typescript
interface InputProps {
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  /** Size preset */
  size: 'sm' | 'md' | 'lg';
  /** Disable interaction */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message (renders below input) */
  errorMessage?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Controlled value */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Blur handler */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Focus handler */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Accessible label (required if no visible label) */
  'aria-label'?: string;
  /** ID of describing element */
  'aria-describedby'?: string;
  /** Additional CSS class */
  className?: string;
}

const Input: React.ForwardRefExoticComponent<
  InputProps & React.RefAttributes<HTMLInputElement>
>;
```

**Accessibility**:
- MUST link error message via `aria-describedby`
- MUST have visible focus indicator
- Error state MUST be announced (not color alone)

---

### Textarea

```typescript
interface TextareaProps {
  /** Size preset */
  size: 'sm' | 'md' | 'lg';
  /** Disable interaction */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Number of visible rows */
  rows?: number;
  /** Resize behavior */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  /** Controlled value */
  value?: string;
  /** Default value */
  defaultValue?: string;
  /** Change handler */
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Additional CSS class */
  className?: string;
}

const Textarea: React.ForwardRefExoticComponent<
  TextareaProps & React.RefAttributes<HTMLTextAreaElement>
>;
```

---

### Checkbox

```typescript
interface CheckboxProps {
  /** Checked state */
  checked?: boolean;
  /** Default checked (uncontrolled) */
  defaultChecked?: boolean;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Disable interaction */
  disabled?: boolean;
  /** Change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Checkbox label */
  children?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Checkbox: React.ForwardRefExoticComponent<
  CheckboxProps & React.RefAttributes<HTMLInputElement>
>;
```

---

### Radio

```typescript
interface RadioProps {
  /** Checked state */
  checked?: boolean;
  /** Radio value */
  value: string;
  /** Radio name (groups radios) */
  name: string;
  /** Disable interaction */
  disabled?: boolean;
  /** Change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Radio label */
  children?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Radio: React.ForwardRefExoticComponent<
  RadioProps & React.RefAttributes<HTMLInputElement>
>;

interface RadioGroupProps {
  /** Group name */
  name: string;
  /** Selected value */
  value?: string;
  /** Default value */
  defaultValue?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Radio children */
  children: React.ReactNode;
}

const RadioGroup: React.FC<RadioGroupProps>;
```

---

### Card

```typescript
interface CardProps {
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Shadow elevation */
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  /** Border style */
  bordered?: boolean;
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Card: React.FC<CardProps>;

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const CardHeader: React.FC<CardHeaderProps>;
const CardBody: React.FC<CardBodyProps>;
const CardFooter: React.FC<CardFooterProps>;
```

---

### Alert

```typescript
interface AlertProps {
  /** Alert variant */
  variant: 'info' | 'success' | 'warning' | 'error';
  /** Alert title */
  title?: string;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Alert content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Alert: React.FC<AlertProps>;
```

**Accessibility**:
- MUST use `role="alert"` for error/warning
- MUST use `role="status"` for info/success
- Dismiss button MUST have accessible label

---

## Typography Components

### Heading

```typescript
interface HeadingProps {
  /** Semantic level (h1-h6) */
  as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Visual size (can differ from semantic level) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  /** Font weight */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Text color */
  color?: 'primary' | 'secondary' | 'muted';
  /** Heading content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Heading: React.FC<HeadingProps>;
```

---

### Text

```typescript
interface TextProps {
  /** Semantic element */
  as?: 'p' | 'span' | 'div' | 'label';
  /** Font size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Font weight */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Text color */
  color?: 'primary' | 'secondary' | 'muted' | 'link' | 'error' | 'success';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Truncate with ellipsis */
  truncate?: boolean;
  /** Text content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Text: React.FC<TextProps>;
```

---

## Layout Components

### Stack

```typescript
interface StackProps {
  /** Stack direction */
  direction?: 'horizontal' | 'vertical';
  /** Gap between items */
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  /** Alignment on cross axis */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justify on main axis */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Allow wrapping */
  wrap?: boolean;
  /** Stack children */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Stack: React.FC<StackProps>;

// Convenience aliases
const HStack: React.FC<Omit<StackProps, 'direction'>>;
const VStack: React.FC<Omit<StackProps, 'direction'>>;
```

---

### Grid

```typescript
interface GridProps {
  /** Number of columns */
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  /** Gap between items */
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  /** Grid children */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Grid: React.FC<GridProps>;

interface GridItemProps {
  /** Column span */
  colSpan?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  /** Row span */
  rowSpan?: number;
  /** Grid item content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const GridItem: React.FC<GridItemProps>;
```

---

### Container

```typescript
interface ContainerProps {
  /** Max width preset */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Center container */
  centered?: boolean;
  /** Horizontal padding */
  paddingX?: 0 | 2 | 4 | 6 | 8;
  /** Container content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Container: React.FC<ContainerProps>;
```

---

## Interaction Components

### Modal

```typescript
interface ModalProps {
  /** Open state */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Close on backdrop click */
  closeOnOverlayClick?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Initial focus element */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Return focus element */
  returnFocusRef?: React.RefObject<HTMLElement>;
  /** Modal content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Modal: React.FC<ModalProps>;

const ModalHeader: React.FC<{ children: React.ReactNode }>;
const ModalBody: React.FC<{ children: React.ReactNode }>;
const ModalFooter: React.FC<{ children: React.ReactNode }>;
```

**Accessibility**:
- MUST trap focus within modal
- MUST return focus on close
- MUST have accessible title via `aria-labelledby`
- MUST close on Escape (unless disabled)

---

### Dropdown / Select

```typescript
interface SelectProps {
  /** Selected value */
  value?: string;
  /** Default value */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disable interaction */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Change handler */
  onChange?: (value: string) => void;
  /** Select options */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Select: React.FC<SelectProps>;

interface SelectOptionProps {
  /** Option value */
  value: string;
  /** Disable option */
  disabled?: boolean;
  /** Option label */
  children: React.ReactNode;
}

const SelectOption: React.FC<SelectOptionProps>;
```

---

### Tabs

```typescript
interface TabsProps {
  /** Active tab value */
  value?: string;
  /** Default tab value */
  defaultValue?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Tab orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Tabs content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Tabs: React.FC<TabsProps>;

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabProps {
  /** Tab value */
  value: string;
  /** Disable tab */
  disabled?: boolean;
  /** Tab label */
  children: React.ReactNode;
}

interface TabPanelProps {
  /** Corresponding tab value */
  value: string;
  /** Panel content */
  children: React.ReactNode;
}

const TabList: React.FC<TabListProps>;
const Tab: React.FC<TabProps>;
const TabPanel: React.FC<TabPanelProps>;
```

**Accessibility**:
- MUST use `role="tablist"`, `role="tab"`, `role="tabpanel"`
- MUST support arrow key navigation
- MUST link tabs to panels via `aria-controls`

---

### Tooltip

```typescript
interface TooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Trigger element */
  children: React.ReactElement;
  /** Placement relative to trigger */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Show delay (ms) */
  openDelay?: number;
  /** Hide delay (ms) */
  closeDelay?: number;
  /** Disable tooltip */
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps>;
```

**Accessibility**:
- MUST be keyboard accessible (focus trigger)
- MUST use `role="tooltip"` and `aria-describedby`

---

### Badge

```typescript
interface BadgeProps {
  /** Badge variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  /** Badge size */
  size?: 'sm' | 'md' | 'lg';
  /** Badge content */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

const Badge: React.FC<BadgeProps>;
```

---

### Spinner

```typescript
interface SpinnerProps {
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg';
  /** Spinner color */
  color?: 'primary' | 'secondary' | 'current';
  /** Accessible label */
  label?: string;
  /** Additional CSS class */
  className?: string;
}

const Spinner: React.FC<SpinnerProps>;
```

**Accessibility**:
- MUST have `role="status"` or `aria-label`
- MUST announce loading to screen readers

---

## Theme Components

### ThemeProvider

```typescript
interface ThemeProviderProps {
  /** Theme variant or custom theme */
  theme?: 'light' | 'dark' | 'system' | ThemeContract;
  /** Provider children */
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps>;
```

### useTheme Hook

```typescript
interface UseThemeReturn {
  /** Current theme name */
  theme: 'light' | 'dark' | string;
  /** Set theme */
  setTheme: (theme: 'light' | 'dark' | 'system' | string) => void;
  /** Resolved theme (when 'system' is used) */
  resolvedTheme: 'light' | 'dark';
}

function useTheme(): UseThemeReturn;
```
