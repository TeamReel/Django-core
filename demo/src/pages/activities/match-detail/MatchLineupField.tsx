import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { FORMATION_LAYOUTS } from '../../identity/content-generation';
import { iterVariants, type TeamreelAssets } from '../../../utils/assetMetadata';
import styles from './MatchLineupField.module.css';

/** Squad member / participation record */
interface SquadMemberUser {
  id?: string;
  name?: string;
  user_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface SquadMember {
  id: string;
  isGuest?: boolean;
  user?: SquadMemberUser;
  member?: SquadMemberUser;
  metadata?: { shirt_number?: string; [key: string]: unknown };
  data?: { jersey_number?: string; functional_role?: string; [key: string]: unknown };
  functional_roles?: string[];
}

const getSquadMemberName = (p: SquadMember): string => {
  const user = p.user || p.member;
  if (!user) return 'Unknown';
  if (user.name) return user.name;
  if (user.user_name) return user.user_name;
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (full) return full;
  if (user.email) return user.email;
  return 'Unknown';
};

const getUserKey = (p: SquadMember): string => {
  const user = p.user || p.member;
  if (user?.id) return String(user.id);
  return String(p.id);
};

export interface FieldVisualizationProps {
  lineupFormation: string;
  lineupSlots: Record<string, string[]>;
  setLineupSlots: (slots: Record<string, string[]>) => void;
  lineupSquad: Record<string, SquadMember[]>;
  lineupBenchStatus: Record<string, string>;
  setLineupBenchStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lineupSaving: boolean;
  lineupSaveSuccess: boolean;
  saveLineup: () => Promise<void>;
}

export function FieldVisualization({
  lineupFormation,
  lineupSlots,
  setLineupSlots,
  lineupSquad,
  lineupBenchStatus,
  setLineupBenchStatus,
  lineupSaving,
  lineupSaveSuccess,
  saveLineup,
}: FieldVisualizationProps) {
  const formationLayout =
    FORMATION_LAYOUTS[lineupFormation] || FORMATION_LAYOUTS['4-3-3'];

  // ── Guest players ──
  const [guestPlayers, setGuestPlayers] = useState<SquadMember[]>([]);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestJersey, setGuestJersey] = useState('');

  const addGuestPlayer = () => {
    const name = guestName.trim();
    if (!name) return;
    const guest = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isGuest: true,
      user: { name },
      metadata: guestJersey.trim() ? { shirt_number: guestJersey.trim() } : {},
    };
    setGuestPlayers((prev) => [...prev, guest]);
    setGuestName('');
    setGuestJersey('');
    setShowGuestForm(false);
  };

  const removeGuestPlayer = (guestId: string) => {
    setGuestPlayers((prev) => prev.filter((g) => g.id !== guestId));
    // Also remove from lineup slots if assigned
    const newGk = (lineupSlots.goalkeeper || []).map((id) => id === guestId ? '' : id);
    const newPl = (lineupSlots.player || []).map((id) => id === guestId ? '' : id);
    setLineupSlots({ ...lineupSlots, goalkeeper: newGk, player: newPl });
  };

  // ── Sort helper ──
  const sortByName = (a: SquadMember, b: SquadMember) =>
    getSquadMemberName(a).localeCompare(getSquadMemberName(b), 'nl');

  // ── Asset availability helpers ──
  // Check if role has ANY fullbody assets (uses iterVariants which handles legacy formats)
  const hasFullbodyForRole = (assets: TeamreelAssets | undefined, role: string): boolean => {
    const variants = iterVariants(assets, role, 'images', 'fullbody');
    return variants.some((v) => {
      if (!v.value) return false;
      if (typeof v.value === 'string') return true;
      return !!(v.value.raw || v.value.processed);
    });
  };

  // Check if member has fullbody assets for ANY role
  const hasAnyFullbody = (assets: TeamreelAssets | undefined): boolean => {
    if (!assets?.roles) return false;
    for (const role of Object.keys(assets.roles)) {
      if (hasFullbodyForRole(assets, role)) return true;
    }
    return false;
  };

  const hasKeeperAsset = (p: SquadMember): boolean => {
    if (p.isGuest) return true;
    const assets = (p.metadata as Record<string, unknown>)?.teamreel_assets as TeamreelAssets | undefined;
    // Check 'keeper' and 'goalkeeper' role names, plus fallback to any fullbody
    return hasFullbodyForRole(assets, 'keeper') || hasFullbodyForRole(assets, 'goalkeeper');
  };

  const hasPlayerAsset = (p: SquadMember): boolean => {
    if (p.isGuest) return true;
    const assets = (p.metadata as Record<string, unknown>)?.teamreel_assets as TeamreelAssets | undefined;
    return hasFullbodyForRole(assets, 'player');
  };

  // All members pool (no filtering - everyone shown)
  const allMembers = [
    ...(lineupSquad.goalkeeper || []),
    ...(lineupSquad.player || []),
  ];
  const allMembersDeduped = allMembers
    .filter(
      (p, idx, arr) =>
        arr.findIndex((x) => getUserKey(x) === getUserKey(p)) === idx
    )
    .concat(guestPlayers)
    .sort(sortByName);

  const gkSelected = lineupSlots.goalkeeper || [];
  const playerSelected = lineupSlots.player || [];

  return (
    <div className={`flex-col gap-16 ${styles.root}`}>
      <div
        className={`relative w-full overflow-hidden rounded-12 mx-auto border ${styles.fieldContainer}`}
      >
        {/* Field markings */}
        <div className={`${styles.fieldMarkingHorizontal} ${styles.fieldMarkingTop}`} />
        <div className={`${styles.fieldMarkingHorizontal} ${styles.fieldMarkingCenter}`} />
        <div className={styles.centerCircle} />
        <div className={styles.penaltyBoxBottom} />
        <div className={styles.penaltyBoxTop} />

        {/* Position nodes */}
        {formationLayout.positions.map((pos) => {
          const isGk = pos.slot === 1;
          const role = isGk ? 'goalkeeper' : 'player';
          const idx = isGk ? 0 : pos.slot - 2;
          const selected = isGk ? gkSelected : playerSelected;
          const currentId = selected[idx] || '';
          // All positions use same pool - everyone visible
          const pool = allMembersDeduped;
          // Check asset availability for this position type
          const hasAssetForPosition = isGk ? hasKeeperAsset : hasPlayerAsset;
          const currentMember = currentId
            ? pool.find((p) => p.id === currentId)
            : null;
          const jerseyNumber =
            currentMember?.metadata?.shirt_number ||
            currentMember?.data?.jersey_number;

          return (
            <div
              key={pos.slot}
              className={styles.positionNode}
              style={{ '--pos-x': `${pos.x}%`, '--pos-y': `${pos.y}%` } as React.CSSProperties}
            >
              {/* Position label */}
              <div className={`fs-11 fw-700 ${styles.positionLabel}`}>
                {pos.label}
              </div>

              {/* Dropdown */}
              <select
                value={currentId}
                onChange={(e) => {
                  const newSelected = [...selected];
                  while (newSelected.length <= idx) newSelected.push('');
                  newSelected[idx] = e.target.value;
                  setLineupSlots({ ...lineupSlots, [role]: [...newSelected] });
                }}
                className={`${styles.positionSelect} ${currentId ? styles.positionSelectFilled : ''}`}
              >
                <option value="" className={styles.selectOption}>
                  —
                </option>
                {pool.map((p) => {
                  const name = getSquadMemberName(p);
                  const jersey =
                    p.metadata?.shirt_number || p.data?.jersey_number;
                  const allUsedIds = [...gkSelected, ...playerSelected].filter(
                    Boolean
                  );
                  const isAlreadyUsed =
                    !p.isGuest && allUsedIds.includes(p.id) && p.id !== currentId;
                  const hasAsset = hasAssetForPosition(p);
                  return (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={isAlreadyUsed}
                      className={isAlreadyUsed ? styles.selectOptionDisabled : styles.selectOption}
                    >
                      {hasAsset ? '✓ ' : '⚠ '}
                      {jersey ? `#${jersey} ` : ''}
                      {name}
                      {p.isGuest ? ' (gast)' : ''}
                      {isAlreadyUsed ? ' ✗' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Selected name display */}
              {currentMember && (
                <div className={styles.playerName}>
                  {getSquadMemberName(currentMember)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Guest players section */}
      <div className={`w-full mx-auto ${styles.guestSection}`}>
        {guestPlayers.length > 0 && (
          <div className={styles.guestTags}>
            {guestPlayers.map((g) => (
              <span key={g.id} className={styles.guestTag}>
                {g.metadata?.shirt_number ? `#${g.metadata.shirt_number} ` : ''}
                {getSquadMemberName(g)}
                <button
                  className={styles.guestTagRemove}
                  onClick={() => removeGuestPlayer(g.id)}
                  title="Verwijder gast"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {showGuestForm ? (
          <div className={styles.guestForm}>
            <input
              className={styles.guestInput}
              placeholder="Naam"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGuestPlayer()}
              autoFocus
            />
            <input
              className={`${styles.guestInput} ${styles.guestInputSmall}`}
              placeholder="#"
              value={guestJersey}
              onChange={(e) => setGuestJersey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGuestPlayer()}
            />
            <button className={styles.guestAddBtn} onClick={addGuestPlayer}>
              Toevoegen
            </button>
            <button className={styles.guestCancelBtn} onClick={() => { setShowGuestForm(false); setGuestName(''); setGuestJersey(''); }}>
              Annuleren
            </button>
          </div>
        ) : (
          <button className={styles.addGuestBtn} onClick={() => setShowGuestForm(true)}>
            <UserPlus size={14} /> Gastspeler toevoegen
          </button>
        )}
      </div>

      {/* Summary bar + Save button */}
      <div className={`flex-between rounded-8 fs-13 w-full mx-auto ${styles.summaryBar}`}>
        <span className="text-secondary">
          Formatie:{' '}
          <strong className="text-primary">
            {lineupFormation}
          </strong>
          {' • '}
          {(() => {
            const filled = [...gkSelected, ...playerSelected].filter(
              Boolean
            ).length;
            const total = formationLayout.positions.length;
            return filled === total ? (
              <span className={styles.statusGreen}>
                ✓ Alle {total} posities ingevuld
              </span>
            ) : (
              <span>
                {filled} / {total} posities
              </span>
            );
          })()}
        </span>
        <div className="flex-row gap-8">
          {lineupSaveSuccess && (
            <span className={`fs-12 fw-600 ${styles.statusGreen}`}>
              ✓ Opgeslagen!
            </span>
          )}
          <button
            onClick={saveLineup}
            disabled={lineupSaving}
            className={`fs-13 fw-600 border-none rounded-6 text-white cursor-pointer ${styles.saveButton}`}
          >
            {lineupSaving ? 'Opslaan...' : 'Opstelling opslaan'}
          </button>
        </div>
      </div>

      {/* Bench: squad members not in lineup */}
      {(() => {
        const usedIds = new Set(
          [...gkSelected, ...playerSelected].filter(Boolean)
        );
        const benchMembers = allMembersDeduped.filter(
          (p) => !usedIds.has(p.id)
        );

        if (benchMembers.length === 0) return null;

        return (
          <div className={`w-full mx-auto ${styles.benchContainer}`}>
            <div
              className="fs-14 fw-700 mb-8 text-primary"
            >
              Overige selectie ({benchMembers.length})
            </div>
            <div className={`flex-col gap-4 rounded-8 py-8 ${styles.benchPool}`}>
              {benchMembers.map((p) => {
                const name = getSquadMemberName(p);
                const jersey =
                  p.metadata?.shirt_number || p.data?.jersey_number;
                const status = lineupBenchStatus[p.id] || '';
                return (
                  <div
                    key={p.id}
                    className={`flex-between gap-8 ${styles.benchRow}`}
                  >
                    <span
                      className="fs-13 fw-500 text-primary"
                    >
                      {jersey ? `#${jersey} ` : ''}
                      {name}
                    </span>
                    <div className="flex-row gap-4">
                      <button
                        onClick={() =>
                          setLineupBenchStatus((prev) => {
                            const next = { ...prev };
                            if (next[p.id] === 'wissel') {
                              delete next[p.id];
                            } else {
                              next[p.id] = 'wissel';
                            }
                            return next;
                          })
                        }
                        className={`${styles.benchButton} ${status === 'wissel' ? styles.benchButtonWisselActive : ''}`}
                      >
                        Wissel
                      </button>
                      <button
                        onClick={() =>
                          setLineupBenchStatus((prev) => {
                            const next = { ...prev };
                            if (next[p.id] === 'afwezig') {
                              delete next[p.id];
                            } else {
                              next[p.id] = 'afwezig';
                            }
                            return next;
                          })
                        }
                        className={`${styles.benchButton} ${status === 'afwezig' ? styles.benchButtonAfwezigActive : ''}`}
                      >
                        Afwezig
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
