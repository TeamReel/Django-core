import React from 'react';
import { Button, Badge } from '@django-core/design-system';
import type { ContentTemplate } from './types';
import styles from './TemplateStep.module.css';

interface TemplateStepProps {
  loading: boolean;
  error: string | null;
  templates: ContentTemplate[];
  selectedType: { type: string; subtype: string; label: string } | null;
  organisationSport: { id: number | string; name: string; slug?: string } | null;
  fetchTemplates: (type: string, subtype: string) => void;
  onSelectTemplate: (template: ContentTemplate) => void;
}

export function TemplateStep({
  loading,
  error,
  templates,
  selectedType,
  organisationSport,
  fetchTemplates,
  onSelectTemplate,
}: TemplateStepProps) {
  return (
    <div className="flex-col gap-16">
      {loading && (
        <div className={`text-center text-muted ${styles.loadingContainer}`}>
          <div className={`inline-block rounded-full mb-16 ${styles.spinner}`}></div>
          <div>Templates laden...</div>
        </div>
      )}

      {error && (
        <div className="flex-col gap-16">
          <div className={`text-center py-24 px-16 rounded-8 ${styles.errorBox}`}>
            <div className={`mb-8 ${styles.errorTitle}`}>Kan templates niet laden</div>
            <div className="fs-14 mb-16 text-secondary">
              Controleer of de backend server draait.
            </div>
            <Button variant="secondary" size="sm" onClick={() => selectedType && fetchTemplates(selectedType.type, selectedType.subtype)}>
              Opnieuw proberen
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div className={`text-center ${styles.emptyState}`}>
          <div className={`rounded-12 flex-center fs-20 fw-700 mx-auto mb-16 bg-surface-2 text-muted ${styles.emptyIcon}`}>?</div>
          <div className="mb-8 text-secondary">Geen templates gevonden voor "{selectedType?.label}"</div>
          <div className="fs-14 mb-16 text-muted">
            {organisationSport ? `Zoeken naar ${organisationSport.name} templates` : 'Geen sportfilter actief'}
          </div>
          <a href="/content-templates" className={`fs-14 ${styles.templateLink}`}>
            Ga naar Content Templates
          </a>
        </div>
      )}

      {!loading && !error && templates.length > 0 && (
        <div className={`grid gap-16 ${styles.templateGrid}`}>
          {templates.map(template => {
            const memberReqs = template.input_requirements?.members;
            const reqSummary: string[] = [];
            if (memberReqs) {
              (['goalkeeper', 'player', 'coach', 'assistant'] as const).forEach(role => {
                const req = memberReqs[role];
                if (req && typeof req !== 'boolean' && req.count) {
                  reqSummary.push(`${req.count} ${role}${req.count > 1 ? 's' : ''}`);
                }
              });
            }

            return (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="rounded-8 p-16 cursor-pointer flex-col gap-8 border transition"
              >
                <div className={`rounded-6 flex-center fs-14 ${styles.templatePreview}`}>
                  {template.style_variant || 'Voorbeeld'}
                </div>
                <div className="fw-600">{template.name}</div>
                {template.description && (
                  <div className={`fs-12 overflow-hidden ${styles.templateDescription}`}>{template.description}</div>
                )}
                <div className="flex-row flex-wrap gap-4">
                  {template.sport_detail && (
                    <Badge variant="info" size="sm">{template.sport_detail.name}</Badge>
                  )}
                  {template.formation_detail && (
                    <Badge variant="default" size="sm">{template.formation_detail.code}</Badge>
                  )}
                  {template.style_variant && (
                    <Badge variant="success" size="sm">{template.style_variant}</Badge>
                  )}
                </div>
                <div className={`flex-between fs-12 pt-8 border-top ${styles.templateFooter}`}>
                  <span>{template.credits_required ?? 1} credit{(template.credits_required ?? 1) !== 1 ? 's' : ''}</span>
                  {reqSummary.length > 0 && (
                    <span>{reqSummary.join(', ')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
