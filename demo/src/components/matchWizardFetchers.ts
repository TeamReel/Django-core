/**
 * matchWizardFetchers — Pure async helpers for MatchWizard data fetching.
 *
 * Extracted from useMatchWizardData to keep the hook slim.
 * Each function is standalone and depends only on the `api` client.
 */
import { api } from '@/api';
import type { SquadMember } from './matchWizardTypes';
import type { ContentTemplate } from '../pages/identity/ContentGenerationModal/types';

// ── Squad members ─────────────────────────────────────────

/**
 * Fetch project members and bucket them into positional groups.
 * Returns `{ goalkeeper: [...], player: [...] }` (and potentially other roles).
 */
export async function fetchSquadMembers(
  projectId: string,
): Promise<Record<string, SquadMember[]>> {
  const members = await api.listAll<SquadMember>(
    `/projects/${encodeURIComponent(String(projectId))}/members/`,
    { pageSize: 100 },
  );

  const groups: Record<string, SquadMember[]> = { goalkeeper: [], player: [] };
  members.forEach(p => {
    let roles: string[] = [];
    if (p.functional_roles?.length) roles = p.functional_roles;
    else if (p.metadata?.functional_roles?.length) roles = p.metadata.functional_roles;
    else if (p.data?.functional_role) roles = [p.data.functional_role];
    else if (p.metadata?.team_role) roles = [p.metadata.team_role];
    else roles = ['player'];

    roles.forEach(role => {
      const nr = role.toLowerCase();
      if (nr === 'goalkeeper' || nr === 'keeper' || nr === 'gk') groups.goalkeeper.push(p);
      else if (groups[nr]) groups[nr].push(p);
      else groups.player.push(p);
    });
  });

  return groups;
}

// ── Content templates ─────────────────────────────────────

/** Fetch all active content-generation templates, grouped by subtype. */
export async function fetchContentTemplates(): Promise<Record<string, ContentTemplate[]>> {
  const { results: all } = await api.list<ContentTemplate>('/content-generation/templates/', {
    params: { is_active: 'true' },
    pageSize: 500,
  });

  const grouped: Record<string, ContentTemplate[]> = {};
  all.forEach(t => {
    const subtype = t.template_subtype || t.template_type;
    if (!grouped[subtype]) grouped[subtype] = [];
    grouped[subtype].push(t);
  });
  return grouped;
}

// ── Save lineup ───────────────────────────────────────────

/** Persist the lineup (formation + slots) into the activity metadata. */
export async function saveLineupToApi(
  matchId: string,
  existingMetadata: Record<string, unknown>,
  formation: string,
  slots: { goalkeeper: string[]; player: string[] },
): Promise<void> {
  await api.patch(`/activities/${encodeURIComponent(String(matchId))}/`, {
    metadata: {
      ...existingMetadata,
      formation,
      lineup: { formation, goalkeeper: slots.goalkeeper, player: slots.player },
    },
  });
}

// ── Template resolution ───────────────────────────────────

/**
 * Pick the best matching template for a given subtype.
 * Falls back to synthetic templates for subtypes that can work without one.
 */
export function resolveTemplate(
  availableTemplates: Record<string, ContentTemplate[]>,
  subtype: string,
  formation?: string,
): ContentTemplate | null {
  const templates = availableTemplates[subtype] || [];
  let matchedTemplate: ContentTemplate | undefined;

  if ((subtype === 'lineup' || subtype === 'lineup_flyer') && templates.length > 0) {
    if (formation) {
      matchedTemplate = templates.find(t =>
        t.formation_detail?.code === formation ||
        t.name.toLowerCase().includes(formation.toLowerCase().replace(/-/g, '')),
      );
    }
    if (!matchedTemplate) matchedTemplate = templates[0];
  } else {
    matchedTemplate = templates[0];
  }

  const syntheticAllowed = ['match_intro', 'goal', 'poster'];
  if (!matchedTemplate && syntheticAllowed.includes(subtype)) {
    const synthetic: Record<string, ContentTemplate> = {
      match_intro: {
        id: 0, name: 'Match Intro', description: '', style_variant: '',
        template_type: 'pre_match', template_subtype: 'match_intro',
        is_active: true, input_requirements: {},
      } satisfies ContentTemplate,
      goal: {
        id: 0, name: 'Goal Celebration', description: '', style_variant: '',
        template_type: 'during_match', template_subtype: 'goal',
        is_active: true, input_requirements: {},
      } satisfies ContentTemplate,
      poster: {
        id: 0, name: 'Elftalfoto', description: '', style_variant: '',
        template_type: 'pre_match', template_subtype: 'poster',
        is_active: true, input_requirements: {
          members: {
            goalkeeper: { count: 1, asset_types: ['in_tenue'] },
            player: { count: 10, asset_types: ['in_tenue'] },
          },
        },
      } satisfies ContentTemplate,
    };
    matchedTemplate = synthetic[subtype];
  }

  return matchedTemplate || null;
}
