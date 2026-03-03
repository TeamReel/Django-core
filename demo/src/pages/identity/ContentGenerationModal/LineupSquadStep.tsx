import React from 'react';
import type { ContentTemplate, Participation, FormationPosition } from './types';
import { ASSET_TYPE_LABELS, FORMATION_LAYOUTS } from './constants';
import { memberHasRequiredAssets, getMissingAssets, getMemberName } from './utils';

interface LineupSquadStepProps {
  selectedTemplate: ContentTemplate;
  seasonSquad: Record<string, Participation[]>;
  selectedMembers: Record<string, string[]>;
  setSelectedMembers: (members: Record<string, string[]>) => void;
  lineupFormation: string;
}

export function LineupSquadStep({
  selectedTemplate,
  seasonSquad,
  selectedMembers,
  setSelectedMembers,
  lineupFormation,
}: LineupSquadStepProps) {
  const formationLayout = FORMATION_LAYOUTS[lineupFormation] || FORMATION_LAYOUTS['4-3-3'];

  // Separate pools: GK dropdown only shows goalkeepers
  // Player slots show ALL non-goalkeeper members
  const gkPool = (seasonSquad.goalkeeper || [])
    .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
  const allMembers = Object.values(seasonSquad).flat() as Participation[];
  const gkIds = new Set(gkPool.map(p => p.id));
  const playerPool = allMembers
    .filter(p => !gkIds.has(p.id))
    .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);

  const playerReq = selectedTemplate.input_requirements?.members?.player;
  const gkReq = selectedTemplate.input_requirements?.members?.goalkeeper;
  const playerAssetTypes = (playerReq && typeof playerReq !== 'boolean' && playerReq.asset_types) || [];
  const gkAssetTypes = (gkReq && typeof gkReq !== 'boolean' && (gkReq as any).asset_types) || playerAssetTypes;

  // Eligible/ineligible split per role
  const eligibleGks = gkPool.filter(p => memberHasRequiredAssets(p, gkAssetTypes, 'goalkeeper'));
  const ineligibleGks = gkPool.filter(p => !memberHasRequiredAssets(p, gkAssetTypes, 'goalkeeper'));
  const eligiblePlayers = playerPool.filter(p => memberHasRequiredAssets(p, playerAssetTypes, 'player'));
  const ineligiblePlayers = playerPool.filter(p => !memberHasRequiredAssets(p, playerAssetTypes, 'player'));
  const gkSelected = selectedMembers.goalkeeper || [];
  const playerSelected = selectedMembers.player || [];

  return (
    <div className="flex-col gap-16">
      {/* Field */}
      <div className="relative w-full overflow-hidden rounded-12 mx-auto border" style={{
        aspectRatio: '3 / 4',
        maxHeight: 'calc(100vh - 340px)',
        background: 'linear-gradient(to bottom, #16a34a, #15803d)',
      }}>
        {/* Field markings */}
        <div style={{ position: 'absolute', left: 16, right: 16, top: '15%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ position: 'absolute', left: 16, right: 16, top: '50%', height: 1, background: 'rgba(255,255,255,0.2)' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, transform: 'translate(-50%, -50%)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', left: '22%', right: '22%', bottom: 0, height: '14%', borderTop: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }} />
        <div style={{ position: 'absolute', left: '22%', right: '22%', top: 0, height: '14%', borderBottom: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }} />

        {/* Position nodes */}
        {formationLayout.positions.map(pos => {
          const isGk = pos.slot === 1;
          const role = isGk ? 'goalkeeper' : 'player';
          const idx = isGk ? 0 : pos.slot - 2;
          const selected = isGk ? gkSelected : playerSelected;
          const currentId = selected[idx] || '';
          const pool = isGk ? gkPool : playerPool;
          const assetTypes = isGk ? gkAssetTypes : playerAssetTypes;
          const eligibleMembers = isGk ? eligibleGks : eligiblePlayers;
          const ineligibleMembers = isGk ? ineligibleGks : ineligiblePlayers;
          const currentMember = currentId === '__guest__' ? null : pool.find(p => p.id === currentId);
          const isGuestSelected = currentId === '__guest__';
          const jerseyNumber = currentMember?.metadata?.shirt_number || currentMember?.data?.jersey_number;

          return (
            <div
              key={pos.slot}
              style={{
                position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                zIndex: 10, minWidth: 100,
              }}
            >
              {/* Position label */}
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>{pos.label}</div>

              {/* Dropdown */}
              <select
                value={currentId}
                onChange={(e) => {
                  const newSelected = [...selected];
                  if (e.target.value) {
                    while (newSelected.length <= idx) newSelected.push('');
                    newSelected[idx] = e.target.value;
                  } else {
                    if (idx < newSelected.length) newSelected[idx] = '';
                  }
                  setSelectedMembers({ ...selectedMembers, [role]: [...newSelected] });
                }}
                style={{
                  width: 120, padding: '4px 6px', fontSize: 11,
                  fontWeight: currentId ? 700 : 400,
                  background: currentId ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: currentId ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6, outline: 'none', cursor: 'pointer', textAlign: 'center',
                  appearance: 'none', WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.6)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: 20,
                }}
              >
                <option value="" style={{ background: '#1e1e1e', color: '#ccc' }}>— Kies —</option>
                <option value="__guest__" style={{ background: '#1e1e1e', color: '#a78bfa' }}>Gast Speler</option>
                {assetTypes.length > 0 && eligibleMembers.length > 0 && (
                  <optgroup label="Beschikbaar">
                    {eligibleMembers.map(p => {
                      const name = getMemberName(p);
                      const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                      const allUsedIds = [...gkSelected, ...playerSelected].filter(id => id && id !== '__guest__');
                      const isAlreadyUsed = allUsedIds.includes(p.id) && p.id !== currentId;
                      return (
                        <option key={p.id} value={p.id} disabled={isAlreadyUsed} style={{ background: '#1e1e1e', color: isAlreadyUsed ? '#666' : '#ccc' }}>
                          {jersey ? `#${jersey} ` : ''}{name}{isAlreadyUsed ? ' —' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
                {assetTypes.length === 0 && pool.map(p => {
                  const name = getMemberName(p);
                  const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                  const allUsedIds = [...gkSelected, ...playerSelected].filter(id => id && id !== '__guest__');
                  const isAlreadyUsed = allUsedIds.includes(p.id) && p.id !== currentId;
                  return (
                    <option key={p.id} value={p.id} disabled={isAlreadyUsed} style={{ background: '#1e1e1e', color: isAlreadyUsed ? '#666' : '#ccc' }}>
                      {jersey ? `#${jersey} ` : ''}{name}{isAlreadyUsed ? ' —' : ''}
                    </option>
                  );
                })}
                {assetTypes.length > 0 && ineligibleMembers.length > 0 && (
                  <optgroup label="Ontbrekende assets">
                    {ineligibleMembers.map(p => {
                      const name = getMemberName(p);
                      const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                      const missingAssets = getMissingAssets(p, assetTypes, role);
                      const missingLabels = missingAssets.map(a => ASSET_TYPE_LABELS[a] || a).join(', ');
                      return (
                        <option key={p.id} value={p.id} disabled style={{ background: '#1e1e1e', color: '#666' }}>
                          {jersey ? `#${jersey} ` : ''}{name} ({missingLabels})
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>

              {/* Show selected name below */}
              {(currentMember || isGuestSelected) && (
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: isGuestSelected ? '#a78bfa' : '#fff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
                }}>
                  {isGuestSelected ? 'Gast' : `${jerseyNumber ? `#${jerseyNumber} ` : ''}${currentMember ? getMemberName(currentMember) : ''}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="flex-between py-8 px-12 bg-surface-2 rounded-8 fs-12" style={{
        color: 'var(--app-text, #111)',
      }}>
        <span>Formatie: <strong>{lineupFormation}</strong></span>
        <span>
          {(() => {
            const filled = [...gkSelected, ...playerSelected].filter(Boolean).length;
            const total = formationLayout.positions.length;
            return filled === total
              ? <span style={{ color: 'var(--color-green-400)' }}>✓ Alle {total} posities ingevuld</span>
              : <span>{filled} / {total} posities ingevuld</span>;
          })()}
        </span>
      </div>
    </div>
  );
}
