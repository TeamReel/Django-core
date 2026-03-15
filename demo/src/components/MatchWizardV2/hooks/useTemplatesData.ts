/**
 * useTemplatesData – Hook for fetching and resolving content templates
 */
import { useState, useCallback } from 'react';
import { api } from '@/api';
import { logger } from '@/utils/logger';
import { useMatchWizard } from '../MatchWizardContext';
import type { ContentTemplate } from '@/pages/identity/ContentGenerationModal/types';

// ============================================================================
// Return type
// ============================================================================

export interface UseTemplatesDataReturn {
  availableTemplates: Record<string, ContentTemplate[]>;
  templatesLoading: boolean;
  fetchTemplates: () => Promise<Record<string, ContentTemplate[]>>;
  resolveTemplate: (subtype: string, overrideTemplates?: Record<string, ContentTemplate[]>) => ContentTemplate | null;
  selectTemplateForSubtype: (subtype: string, overrideTemplates?: Record<string, ContentTemplate[]>) => ContentTemplate | null;
}

export function useTemplatesData(): UseTemplatesDataReturn {
  const { setSelectedTemplate, setTemplatesError, lineupFormation } = useMatchWizard();
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const fetchTemplates = useCallback(async (): Promise<Record<string, ContentTemplate[]>> => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const { results: all } = await api.list<ContentTemplate>('/content-generation/templates/', {
        params: { is_active: true },
        pageSize: 500,
      });

      const grouped: Record<string, ContentTemplate[]> = {};
      all.forEach(t => {
        const subtype = t.template_subtype || t.template_type;
        if (!grouped[subtype]) grouped[subtype] = [];
        grouped[subtype].push(t);
      });
      setAvailableTemplates(grouped);
      return grouped;
    } catch (err) {
      logger.error('Failed to fetch templates', err);
      setTemplatesError('Kon sjablonen niet laden. Controleer je verbinding.');
      return {};
    } finally {
      setTemplatesLoading(false);
    }
  }, [setTemplatesError]);

  const resolveTemplate = useCallback((subtype: string, overrideTemplates?: Record<string, ContentTemplate[]>): ContentTemplate | null => {
    const templates = (overrideTemplates || availableTemplates)[subtype] || [];
    let matchedTemplate: ContentTemplate | undefined;

    if ((subtype === 'lineup' || subtype === 'lineup_flyer') && templates.length > 0) {
      if (lineupFormation) {
        matchedTemplate = templates.find(t =>
          t.formation_detail?.code === lineupFormation ||
          t.name.toLowerCase().includes(lineupFormation.toLowerCase().replace(/-/g, '')),
        );
      }
      if (!matchedTemplate) matchedTemplate = templates[0];
    } else {
      matchedTemplate = templates[0];
    }

    // Synthetic templates for types without backend templates
    const syntheticAllowed = ['match_intro', 'goal', 'poster', 'walkon'];
    if (!matchedTemplate && syntheticAllowed.includes(subtype)) {
      const synthetic: Record<string, ContentTemplate> = {
        match_intro: { id: 0, name: 'Match Intro', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'match_intro', is_active: true, input_requirements: {} },
        goal: { id: 0, name: 'Goal Celebration', description: '', style_variant: '', template_type: 'during_match', template_subtype: 'goal', is_active: true, input_requirements: {} },
        poster: { id: 0, name: 'Elftalfoto', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'poster', is_active: true, input_requirements: {} },
        walkon: { id: 0, name: 'Walk-on Video', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'walkon', is_active: true, input_requirements: {} },
      };
      matchedTemplate = synthetic[subtype];
    }

    return matchedTemplate || null;
  }, [availableTemplates, lineupFormation]);

  const selectTemplateForSubtype = useCallback((subtype: string, overrideTemplates?: Record<string, ContentTemplate[]>) => {
    const template = resolveTemplate(subtype, overrideTemplates);
    setSelectedTemplate(template);
    return template;
  }, [resolveTemplate, setSelectedTemplate]);

  return {
    availableTemplates,
    templatesLoading,
    fetchTemplates,
    resolveTemplate,
    selectTemplateForSubtype,
  };
}
