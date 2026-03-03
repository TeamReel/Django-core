// Temporary type declarations for @django-core/design-system
// TODO: Remove once design-system generates its own type declarations

declare module '@django-core/design-system' {
  import { ReactNode } from 'react';

  export type Severity = 'info' | 'success' | 'warning' | 'error';

  export interface AlertProps {
    title: string;
    severity?: Severity;
    children?: ReactNode;
    onClose?: () => void;
    dismissible?: boolean;
    actions?: ReactNode;
  }

  export const Alert: React.FC<AlertProps>;
}
