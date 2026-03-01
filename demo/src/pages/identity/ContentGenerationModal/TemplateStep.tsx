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
    <div style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
      {loading && (
        <div style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '40px', color: 'var(--app-text-muted, #6b7280)' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', borderWidth: '4px', borderStyle: 'solid', borderColor: 'var(--app-primary, #3B8EA5)', borderTopColor: 'transparent', borderRadius: '9999px', marginBottom: '16px' }}></div>
          <div>Templates laden...</div>
        </div>
      )}

      {error && (
        <div style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '24px', paddingLeft: '16px', paddingRight: '16px', background: '#fefce8', border: '1px solid var(--app-border, #e5e5e5)', borderColor: '#fde68a', borderRadius: '8px' }}>
            <div style={{ color: '#d97706', marginBottom: '8px' }}>Kan templates niet laden</div>
            <div style={{ fontSize: '14px', color: 'var(--app-text-secondary, #4b5563)', marginBottom: '16px' }}>
              Controleer of de backend server draait.
            </div>
            <Button variant="secondary" size="sm" onClick={() => selectedType && fetchTemplates(selectedType.type, selectedType.subtype)}>
              Opnieuw proberen
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '40px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--app-surface-2, #f3f4f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--app-text-muted, #6b7280)', margin: '0 auto 16px' }}>?</div>
          <div style={{ color: 'var(--app-text-secondary, #4b5563)', marginBottom: '8px' }}>Geen templates gevonden voor "{selectedType?.label}"</div>
          <div style={{ fontSize: '14px', color: 'var(--app-text-muted, #9ca3af)', marginBottom: '16px' }}>
            {organisationSport ? `Zoeken naar ${organisationSport.name} templates` : 'Geen sportfilter actief'}
          </div>
          <a href="/content-templates" style={{ color: 'var(--app-link, #3B8EA5)', fontSize: '14px' }}>
            Ga naar Content Templates
          </a>
        </div>
      )}

      {!loading && !error && templates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '16px' }}>
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
                style={{ border: '1px solid var(--app-border, #e5e5e5)', borderRadius: '8px', padding: '16px', cursor: 'pointer', transition: 'all 150ms ease', display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div style={{ background: 'linear-gradient(to bottom right, var(--app-surface-2, #f3f4f6), var(--app-border, #e5e5e5))', aspectRatio: '16 / 9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--app-text-muted, #9ca3af)', fontSize: '14px' }}>
                  {template.style_variant || 'Voorbeeld'}
                </div>
                <div style={{ fontWeight: 600 }}>{template.name}</div>
                {template.description && (
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted, #6b7280)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{template.description}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--app-border, #e5e5e5)', fontSize: '12px', color: 'var(--app-text-muted, #6b7280)' }}>
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
