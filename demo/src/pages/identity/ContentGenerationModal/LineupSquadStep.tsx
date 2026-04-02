import React from 'react';
import type { ContentTemplate, Participation, FormationPosition } from './types';
import { ASSET_TYPE_LABELS } from './constants';
import { useFormations } from '../content-generation';
import { memberHasRequiredAssets, getMissingAssets, getMemberName } from './utils';
import styles from './LineupSquadStep.module.css';

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
  const { formations } = useFormations();
  const formationLayout = formations[lineupFormation] || formations['4-3-3'];

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
  const gkAssetTypes = (gkReq && typeof gkReq !== 'boolean' && gkReq.asset_types) || playerAssetTypes;

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
      <div className={`relative w-full overflow-hidden rounded-12 mx-auto border ${styles.field}`}>
        {/* Field markings */}
        <div className={styles.fieldMarkingHorizontal} data-position="top" />
        <div className={styles.fieldMarkingHorizontal} data-position="mid" />
        <div className={styles.centerCircle} />
        <div className={styles.penaltyBox} data-position="bottom" />
        <div className={styles.penaltyBox} data-position="top" />

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
              className={styles.positionNode}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {/* Position label */}
              <div className={styles.positionLabel}>{pos.label}</div>

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
                className={styles.positionSelect}
                data-selected={currentId ? 'true' : undefined}
              >
                <option value="" className={styles.option}>— Kies —</option>
                <option value="__guest__" className={styles.optionGuest}>Gast Speler</option>
                {assetTypes.length > 0 && eligibleMembers.length > 0 && (
                  <optgroup label="Beschikbaar">
                    {eligibleMembers.map(p => {
                      const name = getMemberName(p);
                      const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
                      const allUsedIds = [...gkSelected, ...playerSelected].filter(id => id && id !== '__guest__');
                      const isAlreadyUsed = allUsedIds.includes(p.id) && p.id !== currentId;
                      return (
                        <option key={p.id} value={p.id} disabled={isAlreadyUsed} className={isAlreadyUsed ? styles.optionUsed : styles.option}>
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
                    <option key={p.id} value={p.id} disabled={isAlreadyUsed} className={isAlreadyUsed ? styles.optionUsed : styles.option}>
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
                        <option key={p.id} value={p.id} disabled className={styles.optionDisabled}>
                          {jersey ? `#${jersey} ` : ''}{name} ({missingLabels})
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>

              {/* Show selected name below */}
              {(currentMember || isGuestSelected) && (
                <div className={styles.selectedName} data-guest={isGuestSelected ? 'true' : undefined}>
                  {isGuestSelected ? 'Gast' : `${jerseyNumber ? `#${jerseyNumber} ` : ''}${currentMember ? getMemberName(currentMember) : ''}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className={`flex-between py-8 px-12 bg-surface-2 rounded-8 fs-12 ${styles.summaryBar}`}>
        <span>Formatie: <strong>{lineupFormation}</strong></span>
        <span>
          {(() => {
            const filled = [...gkSelected, ...playerSelected].filter(Boolean).length;
            const total = formationLayout.positions.length;
            return filled === total
              ? <span className={styles.allFilled}>✓ Alle {total} posities ingevuld</span>
              : <span>{filled} / {total} posities ingevuld</span>;
          })()}
        </span>
      </div>
    </div>
  );
}
