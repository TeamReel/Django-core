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
    <div style={{ gap: '24px', display: 'flex', flexDirection: 'column' }}>

      {/* Lineup Options — Formation & Player Style */}
      {(selectedType?.subtype === 'lineup' || selectedType?.subtype === 'lineup_flyer' || selectedTemplate?.template_subtype === 'lineup' || selectedTemplate?.template_subtype === 'lineup_flyer') && (
        <div style={{
          border: '1px solid var(--app-border, #e5e7eb)',
          borderRadius: 12,
          overflow: 'hidden',
          background: 'var(--app-surface, white)',
        }}>
          {/* Section header */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--app-border, #e5e7eb)',
            background: 'var(--app-surface-2, #f3f4f6)',
          }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--app-text, #111)' }}>
              Lineup opties
            </h4>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Formation selector */}
            <FormationPicker
              selectedFormation={lineupFormation}
              onSelectFormation={setLineupFormation}
              label="Formatie"
            />

            {/* Closeup style selector — not for poster */}
            {!(selectedType?.subtype === 'poster' || selectedTemplate?.template_subtype === 'poster') && (
              <div>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 10,
                  color: 'var(--app-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Weergave Stijl</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { value: 'popout' as const, label: 'Popout', desc: 'Speler los van achtergrond', icon: 'P' },
                    { value: 'badge' as const, label: 'Badge', desc: 'Ronde spelersfoto', icon: 'B' },
                  ].map(opt => {
                    const isSelected = lineupCloseupStyle === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setLineupCloseupStyle(opt.value)}
                        style={{
                          position: 'relative', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 16px',
                          border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                          borderRadius: 12,
                          background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                          color: 'var(--app-text, #111)', cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          backgroundColor: isSelected ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700,
                          color: isSelected ? 'white' : 'var(--app-primary, #3B8EA5)',
                        }}>{opt.icon}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--app-text-muted, #6b7280)', marginTop: 1 }}>{opt.desc}</div>
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 6, right: 6,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: '#fff', fontWeight: 700,
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
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 10,
                  color: 'var(--app-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Animatie Stijl</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                        style={{
                          position: 'relative', flex: '1 1 calc(33% - 8px)', minWidth: 80,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '10px 6px',
                          border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                          borderRadius: 10,
                          background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                          color: 'var(--app-text, #111)', cursor: 'pointer', transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: '#fff', fontWeight: 700,
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
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 10,
                  color: 'var(--app-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Introductie Stijl</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'per_line', label: 'Per linie', icon: 'L', desc: 'Hele linie tegelijk' },
                    { value: 'per_player', label: 'Per speler', icon: 'S', desc: 'Eén voor één, groot in beeld' },
                  ].map(opt => {
                    const isSelected = lineupIntroStyle === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setLineupIntroStyle(opt.value as typeof lineupIntroStyle)}
                        style={{
                          position: 'relative', flex: 1,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          padding: '12px 8px',
                          border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                          borderRadius: 10,
                          background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                          color: 'var(--app-text, #111)', cursor: 'pointer', transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          backgroundColor: isSelected ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700,
                          color: isSelected ? 'white' : 'var(--app-primary, #3B8EA5)',
                        }}>{opt.icon}</div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--app-text-muted, #6b7280)' }}>{opt.desc}</span>
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: '#fff', fontWeight: 700,
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
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 10,
                  color: 'var(--app-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Achtergrond / Locatie</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                  {/* Default option */}
                  <button
                    onClick={() => setSelectedBackgroundUrl(null)}
                    style={{
                      position: 'relative',
                      border: !selectedBackgroundUrl ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                      borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0,
                      background: !selectedBackgroundUrl ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ width: '100%', aspectRatio: '9/16', background: 'linear-gradient(to bottom, #16a34a, #14532d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Auto</span>
                    </div>
                    <div style={{
                      padding: '4px 0', textAlign: 'center', fontWeight: 600, fontSize: 10,
                      color: !selectedBackgroundUrl ? 'white' : 'var(--app-text, #111)',
                      background: !selectedBackgroundUrl ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                    }}>
                      Standaard
                    </div>
                    {!selectedBackgroundUrl && (
                      <div style={{
                        position: 'absolute', top: 3, right: 3,
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: '#fff', fontWeight: 700,
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
                        style={{
                          position: 'relative',
                          border: isSelected ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
                          borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0,
                          background: isSelected ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ width: '100%', aspectRatio: '9/16', background: `url(${bg.url}) center/cover` }} />
                        <div style={{
                          padding: '4px 0', textAlign: 'center', fontWeight: 600, fontSize: 10,
                          color: isSelected ? 'white' : 'var(--app-text, #111)',
                          background: isSelected ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {bg.label || bg.profile_name || 'Locatie'}
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 3, right: 3,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, color: '#fff', fontWeight: 700,
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
          <div key={role} style={{ border: '1px solid var(--app-border, #e5e5e5)', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--app-border, #e5e5e5)' }}>
              <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--app-text, #1C355E)' }}>{renderRoleLabel(role)}</span>
            </div>

            <div style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
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
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontSize: '14px', color: 'var(--app-text-secondary, #4b5563)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={positionLabel}>
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
                      style={{ width: '100%', paddingLeft: '12px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', border: '1px solid var(--app-border, #e5e5e5)', borderRadius: '6px', background: 'var(--app-surface, #ffffff)', fontSize: '14px' }}
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
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--app-border, #e5e5e5)', fontSize: '12px', color: 'var(--app-text-muted, #6b7280)' }}>
                  {(() => {
                    const eligible = available.filter(p => memberHasRequiredAssets(p, assetTypes, role)).length;
                    const total = available.length;
                    if (eligible === 0 && total > 0) {
                      return (
                        <span style={{ color: 'var(--app-error, #E63946)' }}>
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
