import React from 'react';
import { Button, Badge } from '@django-core/design-system';
import type { ContentTemplate } from './types';

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
        <div className="text-center" style={{ paddingTop: '40px', paddingBottom: '40px', color: 'var(--app-text-muted, #6b7280)' }}>
          <div className="inline-block rounded-full mb-16" style={{ width: '32px', height: '32px', borderWidth: '4px', borderStyle: 'solid', borderColor: 'var(--app-primary, #3B8EA5)', borderTopColor: 'transparent' }}></div>
          <div>Templates laden...</div>
        </div>
      )}

      {error && (
        <div className="flex-col gap-16">
          <div className="text-center py-24 px-16 rounded-8" style={{ background: '#fefce8', border: '1px solid var(--app-border, #e5e5e5)', borderColor: '#fde68a' }}>
            <div className="mb-8" style={{ color: '#d97706' }}>Kan templates niet laden</div>
            <div className="fs-14 mb-16" style={{ color: 'var(--app-text-secondary, #4b5563)' }}>
              Controleer of de backend server draait.
            </div>
            <Button variant="secondary" size="sm" onClick={() => selectedType && fetchTemplates(selectedType.type, selectedType.subtype)}>
              Opnieuw proberen
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div className="text-center" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
          <div className="rounded-12 flex-center fs-20 fw-700" style={{ width: 48, height: 48, background: 'var(--app-surface-2, #f3f4f6)', color: 'var(--app-text-muted, #6b7280)', margin: '0 auto 16px' }}>?</div>
          <div className="mb-8" style={{ color: 'var(--app-text-secondary, #4b5563)' }}>Geen templates gevonden voor "{selectedType?.label}"</div>
          <div className="fs-14 mb-16" style={{ color: 'var(--app-text-muted, #9ca3af)' }}>
            {organisationSport ? `Zoeken naar ${organisationSport.name} templates` : 'Geen sportfilter actief'}
          </div>
          <a href="/content-templates" className="fs-14" style={{ color: 'var(--app-link, #3B8EA5)' }}>
            Ga naar Content Templates
          </a>
        </div>
      )}

      {!loading && !error && templates.length > 0 && (
        <div className="grid gap-16" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
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
                className="rounded-8 p-16 cursor-pointer flex-col gap-8"
                style={{ border: '1px solid var(--app-border, #e5e5e5)', transition: 'all 150ms ease' }}
              >
                <div className="rounded-6 flex-center fs-14" style={{ background: 'linear-gradient(to bottom right, var(--app-surface-2, #f3f4f6), var(--app-border, #e5e5e5))', aspectRatio: '16 / 9', color: 'var(--app-text-muted, #9ca3af)' }}>
                  {template.style_variant || 'Voorbeeld'}
                </div>
                <div className="fw-600">{template.name}</div>
                {template.description && (
                  <div className="fs-12 overflow-hidden" style={{ color: 'var(--app-text-muted, #6b7280)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{template.description}</div>
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
                <div className="flex-between fs-12" style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--app-border, #e5e5e5)', color: 'var(--app-text-muted, #6b7280)' }}>
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
