/**
 * SeasonContentTypesCard - Grid of content type tiles
 */
import React from 'react';
import { Badge, Card } from '@django-core/design-system';
import { CONTENT_TYPES, type ContentTemplate } from '../../identity/ContentGenerationModal';
import { ContentIcon } from '../../../components/ContentIcon';
import type { ThenVsNowVideoType } from '../ThenVsNowModal';
import s from '../ProjectSeasonDetailPage.module.css';

interface SeasonContentTypesCardProps {
  availableTemplates: Record<string, ContentTemplate[]>;
  onOpenContentModal: (template: ContentTemplate, typeLabel: string) => void;
  onOpenThenVsNowModal: (videoType: ThenVsNowVideoType) => void;
}

export function SeasonContentTypesCard({
  availableTemplates,
  onOpenContentModal,
  onOpenThenVsNowModal,
}: SeasonContentTypesCardProps) {
  return (
    <Card title="Season Content">
      <div className={s.tilesGrid}>
        {CONTENT_TYPES.season?.items.map(item => {
          const templates = availableTemplates[item.subtype] || [];
          const matchedTemplate = templates[0];
          const hasTemplate = !!matchedTemplate;
          const isThenVsNow = item.subtype === 'transformation' || item.subtype === 'duo_portret' || item.subtype === 'duo_portret_cover' || item.subtype === 'duo_portret_overlay' || item.subtype === 'sidebyside_cover' || item.subtype === 'sidebyside_overlay' || item.subtype === 'walking_composite';

          return (
            <div
              key={item.id}
              onClick={() => {
                if (isThenVsNow) {
                  onOpenThenVsNowModal(item.subtype as ThenVsNowVideoType);
                } else if (hasTemplate) {
                  onOpenContentModal(matchedTemplate, item.label);
                }
              }}
              title={isThenVsNow
                ? `Create ${item.label}`
                : hasTemplate
                ? `Create ${item.label}${matchedTemplate?.style_variant ? ` (${matchedTemplate.style_variant})` : ''}`
                : `No ${item.label} template available`
              }
              className={s.contentTile}
              style={{
                border: (isThenVsNow || hasTemplate) ? '1px solid var(--app-border)' : '1px dashed var(--app-border)',
                cursor: (isThenVsNow || hasTemplate) ? 'pointer' : 'not-allowed',
                opacity: (isThenVsNow || hasTemplate) ? 1 : 0.5,
                backgroundColor: (isThenVsNow || hasTemplate) ? 'var(--app-card-bg)' : 'var(--app-bg)',
              }}
              onMouseEnter={(e) => {
                if (isThenVsNow || hasTemplate) {
                  e.currentTarget.style.borderColor = 'var(--app-primary)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--app-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className={s.contentTileIcon} style={{
                filter: (isThenVsNow || hasTemplate) ? 'none' : 'grayscale(100%)',
              }}>
                <ContentIcon icon={item.icon} size={20} />
              </div>
              <div className={s.contentTileLabel} style={{
                color: (isThenVsNow || hasTemplate) ? 'var(--app-text)' : 'var(--app-muted-text)',
              }}>
                {item.label}
              </div>
              {hasTemplate && matchedTemplate && (
                <div className={s.contentTileMeta}>
                  {matchedTemplate.style_variant && (
                    <Badge variant="info" size="sm" className={s.badgeXs}>{matchedTemplate.style_variant}</Badge>
                  )}
                  {matchedTemplate.credits_required && matchedTemplate.credits_required > 0 && (
                    <span className={s.creditsText}>
                      {matchedTemplate.credits_required} cr
                    </span>
                  )}
                </div>
              )}
              {!hasTemplate && (
                <div className={s.noTemplate}>\u2014</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
