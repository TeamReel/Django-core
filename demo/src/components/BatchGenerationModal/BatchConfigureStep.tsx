/**
 * BatchConfigureStep — template selector, default params, member list with overrides.
 */
import React from 'react';
import { Badge } from '@django-core/design-system';
import type { AssetTemplate, TemplateParameter } from '../../constants/assetTemplates';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import type { BatchMember, MemberParams } from './batchTypes';
import styles from './BatchConfigureStep.module.css';

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
      <label className={`block fs-13 fw-600 ${styles.templateLabel}`}>
        Template
      </label>
      <div className="flex-row gap-8 flex-wrap">
        {memberTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTemplateId(t.id)}
            className={`rounded-8 text-primary cursor-pointer fs-13 flex-row items-center gap-6 ${styles.templateButton}`}
            data-selected={selectedTemplateId === t.id}
          >
            <span>{t.icon}</span>
            <span>{t.name}</span>
            {t.outputType === 'video' && (
              <Badge variant="info" className={styles.videoBadge}>Video</Badge>
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Default params */}
    {selectedTemplate && (
      <div className="mb-20">
        <label className={`block fs-13 fw-600 ${styles.defaultParamsLabel}`}>
          Standaard Instellingen (voor alle members)
        </label>
        <div className="flex-row flex-wrap gap-12 p-12 rounded-8 bg-surface-2 border">
          {Object.entries(selectedTemplate.parameters).map(([key, param]) => {
            if (!isParamVisible(param, defaultParams)) return null;
            return (
              <div key={key} className={styles.paramGroup}>
                <label className={`block fs-11 text-muted ${styles.paramLabel}`}>
                  {param.label}
                </label>
                <select
                  value={defaultParams[key] || param.default}
                  onChange={(e) => setDefaultParams((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={styles.select}
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
    <div className={`mb-20 rounded-8 fs-12 text-muted ${styles.autoProcessNotice}`}>
      ✅ Bewerking (achtergrond verwijderen, closeup crop) verloopt automatisch na goedkeuring
    </div>

    {/* Info box for video templates */}
    {selectedTemplate && (selectedTemplate.category === 'intro' || selectedTemplate.category === 'celebration') && (
      <div className={`mb-16 p-12 rounded-8 fs-13 text-primary ${styles.videoInfoBox}`}>
        <div className="fw-600 mb-4">🔄 Slimme video verwerking</div>
        <div className={`fs-12 ${styles.videoInfoDescription}`}>
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
              className={styles.memberRow}
              data-missing={missingPerson}
              data-has-overrides={hasOverrides}
            >
              {member.profilePhotoUrl ? (
                <img src={getAssetUrl(member.profilePhotoUrl) || ''} alt="" className={styles.avatar} />
              ) : (
                <div className={`flex-center ${styles.avatarFallback}`}>
                  👤
                </div>
              )}
              <div className="flex-1-min">
                <div className="fs-14 fw-500">{member.name}</div>
                {missingPerson && (
                  <div className="fs-11 text-error">⚠️ Geen input foto beschikbaar</div>
                )}
                {existingVideoVariant && (
                  <div className="fs-11 text-success">✅ Bestaande {existingVideoVariant.replace(/_/g, ' ')} wordt verwerkt</div>
                )}
                {hasOverrides && (
                  <div className={`fs-11 ${styles.overrideText}`}>Aangepaste instellingen</div>
                )}
              </div>
              <span className={`fs-12 text-muted transition ${styles.expandArrow}`} data-expanded={isExpanded}>
                ▶
              </span>
            </div>

            {isExpanded && selectedTemplate && (
              <div className={`mb-8 rounded-8 bg-surface-2 border ${styles.expandedBody}`}>
                <div className={`flex-row flex-wrap gap-10 ${styles.overrideParamsRow}`}>
                  {Object.entries(selectedTemplate.parameters).map(([key, param]) => {
                    if (!isParamVisible(param, effectiveParams)) return null;
                    const hasOverride = memberOverrides[member.id]?.[key] !== undefined;
                    return (
                      <div key={key} className={styles.overrideParamGroup}>
                        <label className={`block fs-11 ${styles.overrideParamLabel}`} data-has-override={hasOverride}>
                          {param.label}
                        </label>
                        <select
                          value={effectiveParams[key] || param.default}
                          onChange={(e) => setMemberParam(member.id, key, e.target.value)}
                          className={styles.overrideSelect}
                          data-has-override={hasOverride}
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
                      className={`rounded-4 border bg-transparent text-muted fs-11 cursor-pointer ${styles.resetButton}`}
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
