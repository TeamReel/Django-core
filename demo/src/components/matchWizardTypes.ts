/**
 * matchWizardTypes — Shared types and constants for MatchWizard.
 */
import { Image, Video, FileText, Play, Zap, Users, Clock } from 'lucide-react';

export type WizardStep = 'match' | 'content' | 'lineup';
export type ContentPhase = 'pre' | 'during' | 'post';

export interface MatchWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
}

export interface SquadMember {
  id: string;
  user?: { id?: string; name?: string; user_name?: string; first_name?: string; last_name?: string; email?: string };
  member?: { id?: string; name?: string; user_name?: string; first_name?: string; last_name?: string; email?: string };
  user_name?: string;
  metadata?: { shirt_number?: string | number; position?: string; functional_roles?: string[]; team_role?: string };
  data?: { jersey_number?: string | number; functional_role?: string };
  functional_roles?: string[];
}

/** Content types that require a lineup to be set first. */
export const LINEUP_REQUIRED_SUBTYPES = new Set([
  'lineup', 'lineup_flyer', 'walkon', 'poster', 'match_intro',
]);

/** Keys map to real template subtype values from backend. */
export const CONTENT_TYPES = {
  pre: [
    { key: 'flyer', subtype: 'flyer', label: 'Match Flyer', icon: Image, description: 'Aankondiging voor socials', templateType: 'pre_match' },
    { key: 'lineup', subtype: 'lineup', label: 'Lineup Video', icon: Video, description: 'Visuele opstelling video', templateType: 'pre_match' },
    { key: 'lineup_flyer', subtype: 'lineup_flyer', label: 'Lineup Flyer', icon: Users, description: 'Opstelling flyer', templateType: 'pre_match' },
    { key: 'match_intro', subtype: 'match_intro', label: 'Match Intro', icon: Play, description: 'Match intro video', templateType: 'pre_match' },
    { key: 'poster', subtype: 'poster', label: 'Elftalfoto', icon: Image, description: 'Teamfoto genereren', templateType: 'pre_match' },
    { key: 'walkon', subtype: 'walkon', label: 'Walk-on Video', icon: Video, description: 'Spelers intro video', templateType: 'pre_match' },
    { key: 'anthem', subtype: 'anthem', label: 'Anthem Video', icon: Play, description: 'Volkslied video', templateType: 'pre_match' },
  ],
  during: [
    { key: 'goal', subtype: 'goal', label: 'Goal Celebration', icon: Zap, description: 'Doelpunt vieren', templateType: 'during_match' },
    { key: 'score_update', subtype: 'score_update', label: 'Score Update', icon: FileText, description: 'Tussenstand delen', templateType: 'during_match' },
  ],
  post: [
    { key: 'end_score', subtype: 'end_score', label: 'Eindstand', icon: FileText, description: 'Uitslag delen', templateType: 'post_match' },
    { key: 'match_summary', subtype: 'match_summary', label: 'Samenvatting', icon: FileText, description: 'Wedstrijd samenvatting', templateType: 'post_match' },
    { key: 'highlights', subtype: 'highlights', label: 'Highlights', icon: Video, description: 'Samenvattingsvideo', templateType: 'post_match' },
  ],
};

export const POSITIONS = [
  { slot: 1, label: 'GK', fullLabel: 'Keeper' },
  { slot: 2, label: 'LB', fullLabel: 'Links Achter' },
  { slot: 3, label: 'CB', fullLabel: 'Centrale Verdediger' },
  { slot: 4, label: 'CB', fullLabel: 'Centrale Verdediger' },
  { slot: 5, label: 'RB', fullLabel: 'Rechts Achter' },
  { slot: 6, label: 'CDM', fullLabel: 'Controleur' },
  { slot: 7, label: 'CM', fullLabel: 'Middenvelder' },
  { slot: 8, label: 'CM', fullLabel: 'Middenvelder' },
  { slot: 9, label: 'LW', fullLabel: 'Links Aanvaller' },
  { slot: 10, label: 'ST', fullLabel: 'Spits' },
  { slot: 11, label: 'RW', fullLabel: 'Rechts Aanvaller' },
];

/** Reusable card-style button for wizard items. */
export const CARD_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '1px solid var(--app-border)',
  backgroundColor: 'var(--app-surface)',
  cursor: 'pointer',
  textAlign: 'left' as const,
  width: '100%',
  transition: 'transform 0.1s ease',
};

/** Get display name from a SquadMember. */
export function getSquadMemberName(p: SquadMember): string {
  const user = p.user || p.member;
  if (!user && p.user_name) return p.user_name;
  if (!user) return 'Onbekend';
  if (user.name) return user.name;
  if (user.user_name) return user.user_name;
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (full) return full;
  if (user.email) return user.email;
  return 'Onbekend';
}
