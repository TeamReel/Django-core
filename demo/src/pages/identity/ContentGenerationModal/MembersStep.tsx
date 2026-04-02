import React from 'react';
import { FormationPicker } from '../content-generation';
import type { ContentTemplate, Participation, FormationPosition } from './types';
import { ASSET_TYPE_LABELS } from './constants';
import { useFormations } from '../content-generation';
import { memberHasRequiredAssets, getMissingAssets, getMemberName, renderRoleLabel } from './utils';
import styles from './MembersStep.module.css';

interface MembersStepProps {
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: ContentTemplate;
  isLineupFlow: boolean;
  seasonSquad: Record<string, Participation[]>;
  selectedMembers: Record<string, string[]>;
  setSelectedMembers: (members: Record<string, string[]>) => void;
  // Lineup options
  lineupFormation: string;
  setLineupFormation: (formation: string) => void;
  lineupCloseupStyle: 'popout' | 'badge';
  setLineupCloseupStyle: (style: 'popout' | 'badge') => void;
  lineupAnimationStyle: 'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade';
  setLineupAnimationStyle: (style: 'slide_up' | 'appear' | 'slide_in' | 'zoom' | 'fade') => void;
  lineupIntroStyle: 'per_line' | 'per_player';
  setLineupIntroStyle: (style: 'per_line' | 'per_player') => void;
  selectedBackgroundUrl: string | null;
  setSelectedBackgroundUrl: (url: string | null) => void;
  appBackgrounds: Array<{ id: string; url: string; label?: string; profile_name?: string }>;
}

export function MembersStep({
  selectedType,
  selectedTemplate,
  isLineupFlow,
  seasonSquad,
  selectedMembers,
  setSelectedMembers,
  lineupFormation,
  setLineupFormation,
  lineupCloseupStyle,
  setLineupCloseupStyle,
  lineupAnimationStyle,
  setLineupAnimationStyle,
  lineupIntroStyle,
  setLineupIntroStyle,
  selectedBackgroundUrl,
  setSelectedBackgroundUrl,
  appBackgrounds,
}: MembersStepProps) {
  // All lineup-related subtypes that should see formation / style / background options
  const LINEUP_SUBTYPES = new Set(['lineup', 'lineup_flyer', 'walkon', 'poster', 'match_intro']);

  const { formations } = useFormations();
  const subtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';
  const isLineupType = LINEUP_SUBTYPES.has(subtype);

  return (
    <div className="flex-col gap-24">

      {/* Lineup Options — Formation & Player Style */}
      {isLineupType && (
        <div className="border rounded-12 overflow-hidden bg-surface">
          {/* Section header */}
          <div className="border-bottom bg-surface-2 py-12 px-16">
            <h4 className="fw-700 m-0 text-primary fs-14">
              Lineup opties
            </h4>
          </div>

          <div className="p-16 flex-col gap-16">

            {/* Formation selector */}
            <FormationPicker
              selectedFormation={lineupFormation}
              onSelectFormation={setLineupFormation}
              label="Formatie"
            />

            {/* Closeup style selector — not for poster */}
            {subtype !== 'poster' && (
              <div>
                <label className="form-label-upper">Weergave Stijl</label>
                <div className="grid-cols-2 gap-8">
                  {[
                    { value: 'popout' as const, label: 'Popout', desc: 'Speler los van achtergrond', icon: 'P' },
                    { value: 'badge' as const, label: 'Badge', desc: 'Ronde spelersfoto', icon: 'B' },
                  ].map(opt => {
                    const isSelected = lineupCloseupStyle === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setLineupCloseupStyle(opt.value)}
                        className={`relative flex-row gap-12 py-12 px-16 rounded-12 cursor-pointer text-left text-primary transition ${styles.closeupButton}`}
                        data-selected={isSelected}
                      >
                        <div className={`flex-center fs-14 fw-700 rounded-10 ${styles.optionIcon}`} data-selected={isSelected}>{opt.icon}</div>
                        <div>
                        <div className="fw-600 fs-13">{opt.label}</div>
                        <div className={`fs-11 text-muted ${styles.optionDesc}`}>{opt.desc}</div>
                        </div>
                        {isSelected && (
                          <div className={`absolute rounded-full flex-center fw-700 ${styles.checkBadge}`}>OK</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Animation style selector — only for video types */}
            {subtype !== 'lineup_flyer' && subtype !== 'poster' && (
              <div>
                <label className="form-label-upper">Animatie Stijl</label>
                <div className="flex-wrap gap-8">
                  {[
                    { value: 'slide_up', label: 'Omhoog' },
                    { value: 'appear', label: 'Direct' },
                    { value: 'slide_in', label: 'Naar binnen' },
                    { value: 'zoom', label: 'Inzoomen' },
                    { value: 'fade', label: 'Vervagen' },
                  ].map(opt => {
                    const isSelected = lineupAnimationStyle === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setLineupAnimationStyle(opt.value as typeof lineupAnimationStyle)}
                        className={`relative flex-col gap-4 cursor-pointer text-primary transition ${styles.animationButton}`}
                        data-selected={isSelected}
                      >
                        <span className="fs-13 fw-600">{opt.label}</span>
                        {isSelected && (
                          <div className={`absolute rounded-full flex-center fw-700 ${styles.checkBadgeSmall}`}>OK</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Intro style selector — per line vs per player — only for video types */}
            {subtype !== 'lineup_flyer' && subtype !== 'poster' && (
              <div>
                <label className="form-label-upper">Introductie Stijl</label>
                <div className="flex-row gap-8">
                  {[
                    { value: 'per_line', label: 'Per linie', icon: 'L', desc: 'Hele linie tegelijk' },
                    { value: 'per_player', label: 'Per speler', icon: 'S', desc: 'Eén voor één, groot in beeld' },
                  ].map(opt => {
                    const isSelected = lineupIntroStyle === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setLineupIntroStyle(opt.value as typeof lineupIntroStyle)}
                        className={`relative flex-col flex-1 gap-6 cursor-pointer text-primary transition ${styles.introButton}`}
                        data-selected={isSelected}
                      >
                        <div className={`flex-center fs-14 fw-700 rounded-10 ${styles.optionIcon}`} data-selected={isSelected}>{opt.icon}</div>
                        <span className="fs-12 fw-600">{opt.label}</span>
                        <span className={`text-muted ${styles.introDesc}`}>{opt.desc}</span>
                        {isSelected && (
                          <div className={`absolute rounded-full flex-center fw-700 ${styles.checkBadgeSmall}`}>OK</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Background / Location selector — always visible for lineup types */}
            <div>
              <label className="form-label-upper">Achtergrond / Locatie</label>
              <div className={`grid gap-8 ${styles.backgroundGrid}`}>
                {/* Default option */}
                <button
                  onClick={() => setSelectedBackgroundUrl(null)}
                  className={`relative overflow-hidden cursor-pointer p-0 rounded-10 transition ${styles.bgButton}`}
                  data-selected={!selectedBackgroundUrl}
                >
                  <div className={`w-full flex-center ${styles.autoPreview}`}>
                    <span className="fs-14 fw-700 text-inverse">Auto</span>
                  </div>
                  <div className={`text-center fw-600 ${styles.bgLabel}`} data-selected={!selectedBackgroundUrl}>
                    Standaard
                  </div>
                  {!selectedBackgroundUrl && (
                    <div className={`absolute rounded-full flex-center fw-700 ${styles.checkBadgeTiny}`}>OK</div>
                  )}
                </button>

                {/* App-level backgrounds */}
                {appBackgrounds.map((bg) => {
                  const isSelected = selectedBackgroundUrl === bg.url;
                  return (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBackgroundUrl(bg.url)}
                      className={`relative overflow-hidden cursor-pointer p-0 rounded-10 transition ${styles.bgButton}`}
                      data-selected={isSelected}
                    >
                      <div className={`w-full ${styles.bgImagePreview}`} style={{ backgroundImage: `url(${bg.url})` }} />
                      <div className={`text-center fw-600 truncate ${styles.bgLabel}`} data-selected={isSelected}>
                        {bg.label || bg.profile_name || 'Locatie'}
                      </div>
                      {isSelected && (
                        <div className={`absolute rounded-full flex-center fw-700 ${styles.checkBadgeTiny}`}>OK</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Member Selection — Compact Dropdown Layout (non-lineup flows only) */}
      {!isLineupFlow && (['goalkeeper', 'player', 'coach', 'assistant'] as const).map(role => {
        const req = selectedTemplate.input_requirements?.members?.[role];
        if (!req || typeof req === 'boolean' || !req.count) return null;

        const isLineupTemplate = selectedTemplate?.template_subtype?.toLowerCase()?.includes('lineup');
        const available = isLineupTemplate && (role === 'player' || role === 'goalkeeper')
          ? [...(seasonSquad.goalkeeper || []), ...(seasonSquad.player || []), ...(seasonSquad.coach || []), ...(seasonSquad.assistant || [])]
              .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx)
          : (seasonSquad[role] || []);
        const selected = selectedMembers[role];
        const assetTypes = req.asset_types || [];

        return (
          <div key={role} className={`border rounded-8 p-16 ${styles.roleSection}`}>
            <div className="mb-12 border-bottom pb-12">
              <span className="fw-600 fs-16 text-primary">{renderRoleLabel(role)}</span>
            </div>

            <div className="flex-col gap-8">
              {Array.from({ length: req.count }).map((_, idx) => {
                const currentSelection = selected[idx];
                const currentMember = available.find(p => p.id === currentSelection);

                let positionLabel = '';
                if (role === 'goalkeeper') {
                  positionLabel = 'Keeper';
                } else if (role === 'player') {
                  const slotNumber = idx + 2;
                  const formationLayout = formations[lineupFormation];
                  const positionData = formationLayout?.positions.find(p => p.slot === slotNumber);
                  positionLabel = positionData ? positionData.label : 'Speler';
                } else if (role === 'coach') {
                  positionLabel = idx === 0 ? 'Coach' : `Coach ${idx + 1}`;
                } else if (role === 'assistant') {
                  positionLabel = idx === 0 ? 'Assistent' : `Assistent ${idx + 1}`;
                } else {
                  positionLabel = `${renderRoleLabel(role)} ${idx + 1}`;
                }

                const eligibleMembers = available.filter(p => memberHasRequiredAssets(p, assetTypes, role));
                const ineligibleMembers = available.filter(p => !memberHasRequiredAssets(p, assetTypes, role));

                return (
                    <div key={`${role}-${idx}`} className={`grid gap-12 items-center ${styles.memberRow}`}>
                    <label className="fs-14 text-secondary fw-500 truncate" title={positionLabel}>
                      {positionLabel}
                    </label>
                    <select
                      value={currentSelection || ''}
                      onChange={(e) => {
                        const newSelected = [...selected];
                        if (e.target.value) {
                          newSelected[idx] = e.target.value;
                        } else {
                          newSelected.splice(idx, 1);
                        }
                        setSelectedMembers({ ...selectedMembers, [role]: newSelected.filter(Boolean) });
                      }}
                      className="w-full px-12 py-8 border rounded-6 bg-surface fs-14"
                    >
                      <option value="">
                        {available.length === 0
                          ? `Geen ${role}s in seizoensselectie`
                          : eligibleMembers.length === 0
                            ? `Geen ${role}s met benodigde assets`
                            : `Selecteer ${role}...`
                        }
                      </option>
                      {/* Eligible members */}
                      {eligibleMembers.length > 0 && assetTypes.length > 0 && (
                        <optgroup label="Beschikbaar (hebben benodigde assets)">
                          {eligibleMembers.map(p => {
                            const memberName = getMemberName(p);
                            const isAlreadySelected = selected.includes(p.id) && p.id !== currentSelection;
                            const jerseyNumber = p.metadata?.shirt_number || p.data?.jersey_number;
                            return (
                              <option key={p.id} value={p.id} disabled={isAlreadySelected}>
                                {jerseyNumber ? `#${jerseyNumber} - ` : ''}{memberName}{isAlreadySelected ? ' (al geselecteerd)' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                      {/* No asset requirements — show all */}
                      {assetTypes.length === 0 && available.map(p => {
                        const memberName = getMemberName(p);
                        const isAlreadySelected = selected.includes(p.id) && p.id !== currentSelection;
                        const jerseyNumber = p.metadata?.shirt_number || p.data?.jersey_number;
                        return (
                          <option key={p.id} value={p.id} disabled={isAlreadySelected}>
                            {jerseyNumber ? `#${jerseyNumber} - ` : ''}{memberName}{isAlreadySelected ? ' (al geselecteerd)' : ''}
                          </option>
                        );
                      })}
                      {/* Ineligible members */}
                      {ineligibleMembers.length > 0 && assetTypes.length > 0 && (
                        <optgroup label="Ontbrekende assets">
                          {ineligibleMembers.map(p => {
                            const memberName = getMemberName(p);
                            const jerseyNumber = p.metadata?.shirt_number || p.data?.jersey_number;
                            const missingAssets = getMissingAssets(p, assetTypes, role);
                            const missingLabels = missingAssets.map(a => ASSET_TYPE_LABELS[a] || a).join(', ');
                            return (
                              <option key={p.id} value={p.id} disabled={true}>
                                {jerseyNumber ? `#${jerseyNumber} - ` : ''}{memberName} (ontbreekt: {missingLabels})
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                    </select>
                  </div>
                );
              })}

              {/* Eligible vs total summary */}
              {assetTypes.length > 0 && (
                <div className="mt-12 border-top fs-12 text-muted pt-12">
                  {(() => {
                    const eligible = available.filter(p => memberHasRequiredAssets(p, assetTypes, role)).length;
                    const total = available.length;
                    if (eligible === 0 && total > 0) {
                      return (
                        <span className="text-error">
                          Geen {role}s hebben de benodigde assets. Genereer eerst assets voor leden.
                        </span>
                      );
                    }
                    return `${eligible} van ${total} ${role}s hebben benodigde assets`;
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
