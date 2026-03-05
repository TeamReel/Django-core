import React from 'react';
import {
  User, Camera, Shirt, ScanFace, Clapperboard,
  PartyPopper, ArrowRightLeft, Trophy, Users, Footprints, Zap,
  Landmark, Briefcase, Star, MapPin, Image, Scissors,
  Home, Plane, Hash, Shield, ClipboardList, Handshake, Activity, History,
  Film, Music, FileText, Type, Folder, Info, Lock,
  CheckCircle2, XCircle, AlertTriangle, Clock, Square, RefreshCw,
  Eye, Send, Play,
  Move, Hand, ThumbsUp, ArrowUp, ArrowDownRight,
  CircleAlert, RotateCw, Ban, Trash2, Sparkles, Wrench,
  Download, Upload, Link, Palette, Wand2, Tag,
  CircleDot, Target, Search, BookOpen, FileQuestion,
  Crown, FlaskConical, Bell, MessageSquare, Mail,
  LayoutGrid, Minus, Check,
  Megaphone, Video, Flag, BarChart3, Rewind, Calendar, Settings, Package, Plus,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

/** Map from icon name string → Lucide component */
const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  // Media slots
  user: User,
  camera: Camera,
  shirt: Shirt,
  'scan-face': ScanFace,
  clapperboard: Clapperboard,
  'party-popper': PartyPopper,
  'arrow-right-left': ArrowRightLeft,
  trophy: Trophy,
  users: Users,
  footprints: Footprints,
  zap: Zap,
  // Club/brand assets
  landmark: Landmark,
  briefcase: Briefcase,
  star: Star,
  'map-pin': MapPin,
  image: Image,
  scissors: Scissors,
  // Kit roles
  home: Home,
  plane: Plane,
  hash: Hash,
  shield: Shield,
  'clipboard-list': ClipboardList,
  handshake: Handshake,
  activity: Activity,
  history: History,
  // File types
  film: Film,
  music: Music,
  'file-text': FileText,
  type: Type,
  folder: Folder,
  info: Info,
  // Processing/status
  'check-circle-2': CheckCircle2,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  clock: Clock,
  square: Square,
  'refresh-cw': RefreshCw,
  eye: Eye,
  send: Send,
  play: Play,
  lock: Lock,
  // Gesture/variant icons
  move: Move,
  hand: Hand,
  'thumbs-up': ThumbsUp,
  'arrow-up': ArrowUp,
  'arrow-down-right': ArrowDownRight,
  'circle-alert': CircleAlert,
  'rotate-cw': RotateCw,
  ban: Ban,
  'trash-2': Trash2,
  sparkles: Sparkles,
  wrench: Wrench,
  // Misc UI
  download: Download,
  upload: Upload,
  link: Link,
  palette: Palette,
  wand: Wand2,
  tag: Tag,
  'circle-dot': CircleDot,
  target: Target,
  search: Search,
  'book-open': BookOpen,
  'file-question': FileQuestion,
  crown: Crown,
  'flask-conical': FlaskConical,
  bell: Bell,
  'message-square': MessageSquare,
  mail: Mail,
  'layout-grid': LayoutGrid,
  minus: Minus,
  check: Check,
  // Content types / categories
  megaphone: Megaphone,
  video: Video,
  flag: Flag,
  'bar-chart-3': BarChart3,
  rewind: Rewind,
  calendar: Calendar,
  settings: Settings,
  package: Package,
  plus: Plus,
};

interface SlotIconProps extends Omit<LucideProps, 'ref'> {
  /** Lucide icon name string */
  name: string;
}

/**
 * Renders a Lucide icon by name string.
 * Used across the app wherever constants define icon names (MEDIA_SLOTS, CLUB_ASSET_SLOTS, etc.).
 * Falls back to a bullet if the name is unknown.
 */
const SlotIcon: React.FC<SlotIconProps> = ({ name, size = 14, ...rest }) => {
  const Icon = ICON_MAP[name];
  if (!Icon) return <span style={{ width: size, height: size, display: 'inline-block' }}>•</span>;
  return <Icon size={size} {...rest} />;
};

export default SlotIcon;
