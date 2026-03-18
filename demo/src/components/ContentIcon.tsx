/**
 * ContentIcon — Maps icon key strings to Lucide icons.
 *
 * Used across content types, categories, and status indicators
 * to replace emoji with consistent, theme-aware Lucide icons.
 */
import React from 'react';
import {
  Megaphone,
  ClipboardList,
  Film,
  Video,
  Camera,
  BarChart3,
  Target,
  Hash,
  Flag,
  RefreshCw,
  Calendar,
  Hand,
  Shirt,
  Zap,
  Image,
  Trophy,
  Sparkles,
  Tag,
  Users,
  Rewind,
  Footprints,
  Music,
  BookOpen,
  User,
  CircleDot,
  Search,
  Bell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  FileText,
  Ban,
  Clapperboard,
  Palette,
  Package,
  type LucideIcon,
} from 'lucide-react';

/** Map of icon key → Lucide icon component */
const ICON_MAP: Record<string, LucideIcon> = {
  megaphone: Megaphone,
  'clipboard-list': ClipboardList,
  clipboard: ClipboardList,
  film: Film,
  video: Video,
  camera: Camera,
  'bar-chart': BarChart3,
  target: Target,
  hash: Hash,
  flag: Flag,
  'refresh-cw': RefreshCw,
  calendar: Calendar,
  hand: Hand,
  shirt: Shirt,
  zap: Zap,
  image: Image,
  trophy: Trophy,
  sparkles: Sparkles,
  tag: Tag,
  users: Users,
  rewind: Rewind,
  footprints: Footprints,
  music: Music,
  'book-open': BookOpen,
  user: User,
  'circle-dot': CircleDot,
  search: Search,
  bell: Bell,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle2,
  'check-circle-2': CheckCircle2,
  'x-circle': XCircle,
  clock: Clock,
  plus: Plus,
  file: FileText,
  ban: Ban,
  clapperboard: Clapperboard,
  palette: Palette,
  package: Package,
};

interface ContentIconProps {
  /** Icon key name (e.g. 'megaphone', 'film', 'clipboard-list') */
  icon: string;
  /** Icon size in pixels (default: 16) */
  size?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Renders a Lucide icon from a string key.
 * Falls back to the raw string if no matching icon is found
 * (preserves backwards compatibility during migration).
 */
export const ContentIcon: React.FC<ContentIconProps> = ({ icon, size = 16, className }) => {
  const IconComponent = ICON_MAP[icon];
  if (IconComponent) {
    return <IconComponent size={size} className={className} aria-hidden="true" />;
  }
  // Fallback: render as text (for unmapped or legacy emoji)
  return <span className={className} aria-hidden="true">{icon}</span>;
};

export default ContentIcon;
