/**
 * MatchWizardV2 Types
 *
 * Shared types for the refactored Match Wizard.
 */
import { Image, Video, FileText, Play, Zap, Users, Clock, type LucideIcon } from 'lucide-react';

// ─── Step Types ───────────────────────────────────────────

export type MatchWizardStepId =
  | 'match'
  | 'content'
  | 'lineup'
  | 'options'
  | 'review'
  | 'generating'
  | 'video_queued'
  | 'success'
  | 'error';

// ─── Content Types ────────────────────────────────────────

export type ContentPhase = 'pre' | 'during' | 'post';
export type OutputType = 'video' | 'image' | 'text';

export interface ContentType {
  key: string;
  subtype: string;
  label: string;
  icon: LucideIcon;
  description: string;
  templateType: string;
  outputType: OutputType;
  thumbnail?: string;
}

// ─── Squad Types ──────────────────────────────────────────

export interface SquadMember {
  id: string;
  user?: { id?: string; name?: string; user_name?: string; first_name?: string; last_name?: string; email?: string };
  member?: { id?: string; name?: string; user_name?: string; first_name?: string; last_name?: string; email?: string };
  user_name?: string;
  metadata?: { shirt_number?: string | number; position?: string; functional_roles?: string[]; team_role?: string };
  data?: { jersey_number?: string | number; functional_role?: string };
  functional_roles?: string[];
  isGuest?: boolean;
}

// ─── Constants ────────────────────────────────────────────

export const LINEUP_REQUIRED_SUBTYPES = new Set([
  'lineup', 'lineup_flyer', 'walkon', 'poster', 'match_intro',
]);

export const HAS_OPTIONS_SUBTYPES = new Set([
  'lineup', 'lineup_flyer', 'flyer', 'goal', 'match_summary',
]);

export const LINEUP_OPTIONS_SUBTYPES = new Set(['lineup', 'lineup_flyer']);

export const CONTENT_TYPES: Record<ContentPhase, ContentType[]> = {
  pre: [
    { key: 'flyer', subtype: 'flyer', label: 'Match Flyer', icon: Image, description: 'Aankondiging voor socials', templateType: 'pre_match', outputType: 'image' },
    { key: 'lineup_flyer', subtype: 'lineup_flyer', label: 'Lineup Flyer', icon: Users, description: 'Opstelling flyer', templateType: 'pre_match', outputType: 'image' },
    { key: 'lineup', subtype: 'lineup', label: 'Lineup Video', icon: Video, description: 'Visuele opstelling video', templateType: 'pre_match', outputType: 'video' },
    { key: 'poster', subtype: 'poster', label: 'Elftalfoto', icon: Image, description: 'Teamfoto genereren', templateType: 'pre_match', outputType: 'image' },
    { key: 'match_intro', subtype: 'match_intro', label: 'Match Intro', icon: Play, description: 'Match intro video', templateType: 'pre_match', outputType: 'video' },
    { key: 'walkon', subtype: 'walkon', label: 'Walk-on Video', icon: Video, description: 'Spelers intro video', templateType: 'pre_match', outputType: 'video' },
    { key: 'anthem', subtype: 'anthem', label: 'Anthem Video', icon: Play, description: 'Volkslied video', templateType: 'pre_match', outputType: 'video' },
  ],
  during: [
    { key: 'goal', subtype: 'goal', label: 'Goal Celebration', icon: Zap, description: 'Doelpunt vieren', templateType: 'during_match', outputType: 'video' },
    { key: 'score_update', subtype: 'score_update', label: 'Score Update', icon: FileText, description: 'Tussenstand delen', templateType: 'during_match', outputType: 'image' },
  ],
  post: [
    { key: 'end_score', subtype: 'end_score', label: 'Eindstand', icon: FileText, description: 'Uitslag delen', templateType: 'post_match', outputType: 'image' },
    { key: 'highlights', subtype: 'highlights', label: 'Highlights', icon: Video, description: 'Samenvattingsvideo', templateType: 'post_match', outputType: 'video' },
    { key: 'match_summary', subtype: 'match_summary', label: 'Samenvatting', icon: FileText, description: 'Wedstrijd samenvatting', templateType: 'post_match', outputType: 'text' },
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

// ─── Helpers ──────────────────────────────────────────────

export function getSquadMemberName(member: SquadMember): string {
  const u = member.user || member.member;
  if (!u) return member.user_name || 'Onbekend';
  if (u.name) return u.name;
  if (u.first_name || u.last_name) return `${u.first_name || ''} ${u.last_name || ''}`.trim();
  if (u.user_name) return u.user_name;
  return member.user_name || 'Onbekend';
}

export function getMemberJersey(member: SquadMember): string | null {
  const j = member.metadata?.shirt_number || member.data?.jersey_number;
  return j ? String(j) : null;
}
