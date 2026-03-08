/**
 * useTemplatesData – Hook for fetching and resolving content templates
 */
import { useState, useCallback } from 'react';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { useMatchWizard } from '../MatchWizardContext';
import type { ContentTemplate } from '../../../pages/identity/ContentGenerationModal/types';

export function useTemplatesData() {
  const apiBaseUrl = getApiBaseUrl();
  const { setSelectedTemplate, setTemplatesError, lineupFormation } = useMatchWizard();
  const [availableTemplates, setAvailableTemplates] = useState<Record<string, ContentTemplate[]>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/content-generation/templates/?is_active=true&page_size=500`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        setTemplatesError('Kon sjablonen niet laden');
        setTemplatesLoading(false);
        return;
      }
      const data = await res.json();
      const rawResults = data?.data?.data || data?.data?.results || data?.results || data?.data || data || [];
      const all: ContentTemplate[] = Array.isArray(rawResults) ? rawResults : [];

      const grouped: Record<string, ContentTemplate[]> = {};
      all.forEach(t => {
        const subtype = t.template_subtype || t.template_type;
        if (!grouped[subtype]) grouped[subtype] = [];
        grouped[subtype].push(t);
      });
      setAvailableTemplates(grouped);
    } catch (err) {
      console.error(err);
      console.error('Failed to fetch templates:', err);
      setTemplatesError('Kon sjablonen niet laden. Controleer je verbinding.');
    } finally {
      setTemplatesLoading(false);
    }
  }, [apiBaseUrl, setTemplatesError]);

  const resolveTemplate = useCallback((subtype: string): ContentTemplate | null => {
    const templates = availableTemplates[subtype] || [];
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
    const syntheticAllowed = ['match_intro', 'goal', 'poster'];
    if (!matchedTemplate && syntheticAllowed.includes(subtype)) {
      const synthetic: Record<string, ContentTemplate> = {
        match_intro: { id: 0, name: 'Match Intro', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'match_intro', is_active: true, input_requirements: {} },
        goal: { id: 0, name: 'Goal Celebration', description: '', style_variant: '', template_type: 'during_match', template_subtype: 'goal', is_active: true, input_requirements: {} },
        poster: { id: 0, name: 'Elftalfoto', description: '', style_variant: '', template_type: 'pre_match', template_subtype: 'poster', is_active: true, input_requirements: {} },
      };
      matchedTemplate = synthetic[subtype];
    }

    return matchedTemplate || null;
  }, [availableTemplates, lineupFormation]);

  const selectTemplateForSubtype = useCallback((subtype: string) => {
    const template = resolveTemplate(subtype);
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
