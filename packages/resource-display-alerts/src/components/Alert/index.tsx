// Placeholder - will implement in WP02
export interface AlertProps {
  title: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
}

export const Alert = ({ title }: AlertProps) => {
  return <div>{title}</div>;
};
