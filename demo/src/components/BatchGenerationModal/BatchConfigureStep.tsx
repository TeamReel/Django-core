/**
 * BatchConfigureStep — template selector, default params, member list with overrides.
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import type { AssetTemplate, TemplateParameter } from '../../constants/assetTemplates';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import type { BatchMember, MemberParams } from './batchTypes';
import { selectStyle, memberRowStyle, avatarStyle } from './batchTypes';

interface BatchConfigureStepProps {
  members: BatchMember[];
  memberTemplates: AssetTemplate[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  selectedTemplate: AssetTemplate;
  defaultParams: MemberParams;
  setDefaultParams: React.Dispatch<React.SetStateAction<MemberParams>>;
  memberOverrides: Record<string, MemberParams>;
  expandedMembers: Set<string>;
  getEffectiveParams: (memberId: string) => MemberParams;
  toggleMemberExpanded: (memberId: string) => void;
  setMemberParam: (memberId: string, key: string, value: string) => void;
  resetMemberOverrides: (memberId: string) => void;
  isParamVisible: (param: TemplateParameter, currentParams: MemberParams) => boolean;
  getInputAssetsForMember: (member: BatchMember, params: MemberParams) => Record<string, string | null>;
}

export const BatchConfigureStep: React.FC<BatchConfigureStepProps> = ({
  members,
  memberTemplates,
  selectedTemplateId,
  setSelectedTemplateId,
  selectedTemplate,
  defaultParams,
  setDefaultParams,
  memberOverrides,
  expandedMembers,
  getEffectiveParams,
  toggleMemberExpanded,
  setMemberParam,
  resetMemberOverrides,
  isParamVisible,
  getInputAssetsForMember,
}) => (
  <>
    {/* Template selector */}
    <div className="mb-20">
      <label className="block fs-13 fw-600" style={{ marginBottom: '6px' }}>
        Template
      </label>
      <div className="flex-row gap-8 flex-wrap">
        {memberTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTemplateId(t.id)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: `2px solid ${selectedTemplateId === t.id ? '#3b82f6' : 'var(--app-border, #444)'}`,
              background: selectedTemplateId === t.id ? 'rgba(59,130,246,0.15)' : 'var(--app-surface-2, #252540)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{t.icon}</span>
            <span>{t.name}</span>
            {t.outputType === 'video' && (
              <Badge variant="info" style={{ fontSize: '10px' }}>Video</Badge>
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Default params */}
    {selectedTemplate && (
      <div className="mb-20">
        <label className="block fs-13 fw-600" style={{ marginBottom: '6px' }}>
          Standaard Instellingen (voor alle members)
        </label>
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '12px',
          borderRadius: '8px',
          background: 'var(--app-surface-2, #252540)',
          border: '1px solid var(--app-border, #333)',
        }}>
          {Object.entries(selectedTemplate.parameters).map(([key, param]) => {
            if (!isParamVisible(param, defaultParams)) return null;
            return (
              <div key={key} style={{ minWidth: '120px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--app-muted-text)', marginBottom: '3px' }}>
                  {param.label}
                </label>
                <select
                  value={defaultParams[key] || param.default}
                  onChange={(e) => setDefaultParams((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={selectStyle}
                >
                  {param.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Auto-processing notice */}
    <div className="mb-20 rounded-8 fs-12 text-muted" style={{
      padding: '10px 12px',
      background: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.25)',
    }}>
      ✅ Bewerking (achtergrond verwijderen, closeup crop) verloopt automatisch na goedkeuring
    </div>

    {/* Info box for video templates */}
    {selectedTemplate && (selectedTemplate.category === 'intro' || selectedTemplate.category === 'celebration') && (
      <div className="mb-16 p-12 rounded-8 fs-13" style={{
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        color: 'var(--app-text)',
      }}>
        <div className="fw-600 mb-4">🔄 Slimme video verwerking</div>
        <div className="fs-12" style={{ opacity: 0.9 }}>
          Members met een bestaande onverwerkte video worden automatisch verwerkt in plaats van opnieuw gegenereerd.
          Alleen members zonder video krijgen een nieuwe gegenereerd.
        </div>
      </div>
    )}

    {/* Member list */}
    <div>
      <div className="flex-between mb-8">
        <label className="fs-13 fw-600">Members ({members.length})</label>
        <span className="fs-11 text-muted">Klik op een member om instellingen aan te passen</span>
      </div>

      {members.map((member) => {
        const isExpanded = expandedMembers.has(member.id);
        const effectiveParams = getEffectiveParams(member.id);
        const hasOverrides = Object.keys(memberOverrides[member.id] || {}).length > 0;
        const inputAssets = getInputAssetsForMember(member, effectiveParams);
        const missingPerson = !inputAssets.person;

        // Check for existing unprocessed video variant
        let existingVideoVariant: string | null = null;
        if (selectedTemplate && (selectedTemplate.category === 'intro' || selectedTemplate.category === 'celebration')) {
          const tr = member.metadata?.teamreel_assets || {};
          const videoCategory = (tr.videos || {})[selectedTemplate.category] || {};
          for (const [key, val] of Object.entries(videoCategory)) {
            if (!val || typeof val !== 'object') continue;
            const v = val as any;
            const state = v.processing_state || 'raw';
            if (v.raw && state !== 'processed' && state !== 'processing' && state !== 'cancelling') {
              existingVideoVariant = key;
              break;
            }
          }
        }

        return (
          <div key={member.id} className="mb-4">
            <div
              onClick={() => toggleMemberExpanded(member.id)}
              style={{
                ...memberRowStyle,
                cursor: 'pointer',
                opacity: missingPerson ? 0.5 : 1,
                borderColor: hasOverrides ? '#3b82f6' : 'var(--app-border, #333)',
              }}
            >
              {member.profilePhotoUrl ? (
                <img src={getAssetUrl(member.profilePhotoUrl) || ''} alt="" style={avatarStyle} />
              ) : (
                <div style={{ ...avatarStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                  👤
                </div>
              )}
              <div className="flex-1-min">
                <div className="fs-14 fw-500">{member.name}</div>
                {missingPerson && (
                  <div className="fs-11" style={{ color: '#ef4444' }}>⚠️ Geen input foto beschikbaar</div>
                )}
                {existingVideoVariant && (
                  <div className="fs-11" style={{ color: '#22c55e' }}>✅ Bestaande {existingVideoVariant.replace(/_/g, ' ')} wordt verwerkt</div>
                )}
                {hasOverrides && (
                  <div className="fs-11" style={{ color: '#3b82f6' }}>Aangepaste instellingen</div>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--app-muted-text)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                ▶
              </span>
            </div>

            {isExpanded && selectedTemplate && (
              <div style={{
                marginLeft: '52px',
                marginBottom: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--app-surface-2, #252540)',
                border: '1px solid var(--app-border, #333)',
              }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {Object.entries(selectedTemplate.parameters).map(([key, param]) => {
                    if (!isParamVisible(param, effectiveParams)) return null;
                    const hasOverride = memberOverrides[member.id]?.[key] !== undefined;
                    return (
                      <div key={key} style={{ minWidth: '110px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '11px',
                          color: hasOverride ? '#3b82f6' : 'var(--app-muted-text)',
                          marginBottom: '3px',
                          fontWeight: hasOverride ? 600 : 400,
                        }}>
                          {param.label}
                        </label>
                        <select
                          value={effectiveParams[key] || param.default}
                          onChange={(e) => setMemberParam(member.id, key, e.target.value)}
                          style={{
                            ...selectStyle,
                            borderColor: hasOverride ? '#3b82f6' : 'var(--app-border, #555)',
                          }}
                        >
                          {param.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  {hasOverrides && (
                    <button
                      onClick={(e) => { e.stopPropagation(); resetMemberOverrides(member.id); }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--app-border)',
                        background: 'transparent',
                        color: 'var(--app-muted-text)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        alignSelf: 'flex-end',
                        marginBottom: '2px',
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </>
);
