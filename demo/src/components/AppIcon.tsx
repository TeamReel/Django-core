import { LucideIcon, LucideProps } from 'lucide-react';

interface AppIconProps extends LucideProps {
  icon: LucideIcon;
}

export const AppIcon = ({ icon: Icon, size = 18, strokeWidth = 1.5, ...props }: AppIconProps) => {
  return <Icon size={size} strokeWidth={strokeWidth} {...props} />;
};
