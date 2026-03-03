import React from 'react';
import { FormationPicker } from '../content-generation';
import type { ContentTemplate, Participation, FormationPosition } from './types';
import { ASSET_TYPE_LABELS, FORMATION_LAYOUTS } from './constants';
import { memberHasRequiredAssets, getMissingAssets, getMemberName, renderRoleLabel } from './utils';

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
  return (
    <div className="flex-col gap-24">

      {/* Lineup Options — Formation & Player Style */}
      {(selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'lineup' || selectedTemplate?.template_subtype === 'lineup_flyer') && (
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
            {!(selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'poster') && (
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
                        className="relative flex-row gap-12 py-12 px-16 rounded-12 cursor-pointer text-left text-primary"
                        style={{
                          border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                          background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div className="flex-center fs-14 fw-700" style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          backgroundColor: isSelected ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                          color: isSelected ? 'white' : 'var(--app-primary, #3B8EA5)',
                        }}>{opt.icon}</div>
                        <div>
                        <div className="fw-600 fs-13">{opt.label}</div>
                        <div className="fs-11 text-muted" style={{ marginTop: 1 }}>{opt.desc}</div>
                        </div>
                        {isSelected && (
                          <div className="absolute rounded-full flex-center fw-700" style={{
                            top: 6, right: 6,
                            width: 18, height: 18,
                            background: 'var(--color-green-400)',
                            fontSize: 10, color: '#fff',
                          }}>✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Animation style selector — only for video */}
            {!(selectedType?.subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'lineup_flyer' || selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'poster') && (
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
                        className="relative flex-col gap-4 cursor-pointer text-primary"
                        style={{
                          flex: '1 1 calc(33% - 8px)', minWidth: 80,
                          alignItems: 'center',
                          padding: '10px 6px',
                          border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                          borderRadius: 10,
                          background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span className="fs-13 fw-600">{opt.label}</span>
                        {isSelected && (
                          <div className="absolute rounded-full flex-center fw-700" style={{
                            top: 4, right: 4,
                            width: 18, height: 18,
                            background: 'var(--color-green-400)',
                            fontSize: 10, color: '#fff',
                          }}>✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Intro style selector — per line vs per player — only for video */}
            {!(selectedType?.subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'lineup_flyer' || selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'poster') && (
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
                        className="relative flex-col flex-1 gap-6 cursor-pointer text-primary"
                        style={{
                          alignItems: 'center',
                          padding: '12px 8px',
                          border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                          borderRadius: 10,
                          background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div className="flex-center fs-14 fw-700" style={{
                          width: 36, height: 36, borderRadius: 10,
                          backgroundColor: isSelected ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                          color: isSelected ? 'white' : 'var(--app-primary, #3B8EA5)',
                        }}>{opt.icon}</div>
                        <span className="fs-12 fw-600">{opt.label}</span>
                        <span className="text-muted" style={{ fontSize: 10 }}>{opt.desc}</span>
                        {isSelected && (
                          <div className="absolute rounded-full flex-center fw-700" style={{
                            top: 4, right: 4,
                            width: 18, height: 18,
                            background: 'var(--color-green-400)',
                            fontSize: 10, color: '#fff',
                          }}>✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Background / Location selector */}
            {appBackgrounds.length > 0 && (
              <div>
                <label className="form-label-upper">Achtergrond / Locatie</label>
                <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                  {/* Default option */}
                  <button
                    onClick={() => setSelectedBackgroundUrl(null)}
                    className="relative overflow-hidden cursor-pointer p-0"
                    style={{
                      border: !selectedBackgroundUrl ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                      borderRadius: 10,
                      background: !selectedBackgroundUrl ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div className="w-full flex-center" style={{ aspectRatio: '9/16', background: 'linear-gradient(to bottom, #16a34a, #14532d)' }}>
                      <span className="fs-14 fw-700 text-inverse">Auto</span>
                    </div>
                    <div className="text-center fw-600" style={{
                      padding: '4px 0', fontSize: 10,
                      color: !selectedBackgroundUrl ? 'white' : 'var(--app-text, #111)',
                      background: !selectedBackgroundUrl ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                    }}>
                      Standaard
                    </div>
                    {!selectedBackgroundUrl && (
                      <div className="absolute rounded-full flex-center fw-700" style={{
                        top: 3, right: 3,
                        width: 16, height: 16,
                        background: 'var(--color-green-400)',
                        fontSize: 9, color: '#fff',
                      }}>✓</div>
                    )}
                  </button>

                  {/* App-level backgrounds */}
                  {appBackgrounds.map((bg) => {
                    const isSelected = selectedBackgroundUrl === bg.url;
                    return (
                      <button
                        key={bg.id}
                        onClick={() => setSelectedBackgroundUrl(bg.url)}
                        className="relative overflow-hidden cursor-pointer p-0"
                        style={{
                          border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                          borderRadius: 10,
                          background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div className="w-full" style={{ aspectRatio: '9/16', background: `url(${bg.url}) center/cover` }} />
                        <div className="text-center fw-600 truncate" style={{
                          padding: '4px 0', fontSize: 10,
                          color: isSelected ? 'white' : 'var(--app-text, #111)',
                          background: isSelected ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                        }}>
                          {bg.label || bg.profile_name || 'Locatie'}
                        </div>
                        {isSelected && (
                          <div className="absolute rounded-full flex-center fw-700" style={{
                            top: 3, right: 3,
                            width: 16, height: 16,
                            background: 'var(--color-green-400)',
                            fontSize: 9, color: '#fff',
                          }}>✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
          <div key={role} className="border rounded-8 p-16" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div className="mb-12 border-bottom" style={{ paddingBottom: '12px' }}>
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
                  const formationLayout = FORMATION_LAYOUTS[lineupFormation];
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
                    <div key={idx} className="grid gap-12" style={{ gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
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
