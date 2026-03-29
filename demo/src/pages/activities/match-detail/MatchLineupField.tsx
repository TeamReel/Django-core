import React from "react";
import { UserPlus, X } from "lucide-react";
import { FORMATION_LAYOUTS } from "../../identity/content-generation";
import {
  type SquadMember,
  getSquadMemberName,
  getUserKey,
  sortByName,
  hasKeeperAsset,
  hasPlayerAsset,
} from "./matchLineupUtils";
import { useGuestPlayers } from "./useGuestPlayers";
import styles from "./MatchLineupField.module.css";

export type { SquadMember } from "./matchLineupUtils";

export interface FieldVisualizationProps {
  lineupFormation: string;
  lineupSlots: Record<string, string[]>;
  setLineupSlots: (slots: Record<string, string[]>) => void;
  lineupSquad: Record<string, SquadMember[]>;
  lineupBenchStatus: Record<string, string>;
  setLineupBenchStatus: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
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
    FORMATION_LAYOUTS[lineupFormation] || FORMATION_LAYOUTS["4-3-3"];

  // ── Guest players (extracted hook) ──
  const {
    guestPlayers,
    showGuestForm,
    setShowGuestForm,
    guestName,
    setGuestName,
    guestJersey,
    setGuestJersey,
    addGuestPlayer,
    removeGuestPlayer,
  } = useGuestPlayers(lineupSlots, setLineupSlots);

  // All members pool (deduplicated across role groups)
  const allMembers = [
    ...(lineupSquad.goalkeeper || []),
    ...(lineupSquad.player || []),
  ];
  const allMembersDeduped = allMembers
    .filter(
      (p, idx, arr) =>
        arr.findIndex((x) => getUserKey(x) === getUserKey(p)) === idx,
    )
    .concat(guestPlayers)
    .sort(sortByName);

  // Filter pools by asset availability — only show members with the right kit
  const keeperPool = allMembersDeduped.filter(hasKeeperAsset);
  const playerPool = allMembersDeduped.filter(hasPlayerAsset);

  const gkSelected = lineupSlots.goalkeeper || [];
  const playerSelected = lineupSlots.player || [];

  return (
    <div className={`flex-col gap-16 ${styles.root}`}>
      <div
        className={`relative w-full overflow-hidden rounded-12 mx-auto border ${styles.fieldContainer}`}
      >
        {/* Field markings */}
        <div
          className={`${styles.fieldMarkingHorizontal} ${styles.fieldMarkingTop}`}
        />
        <div
          className={`${styles.fieldMarkingHorizontal} ${styles.fieldMarkingCenter}`}
        />
        <div className={styles.centerCircle} />
        <div className={styles.penaltyBoxBottom} />
        <div className={styles.penaltyBoxTop} />

        {/* Position nodes */}
        {formationLayout.positions.map((pos) => {
          const isGk = pos.slot === 1;
          const role = isGk ? "goalkeeper" : "player";
          const idx = isGk ? 0 : pos.slot - 2;
          const selected = isGk ? gkSelected : playerSelected;
          const currentId = selected[idx] || "";
          // Use asset-filtered pool: keeper pool for GK, player pool for field
          const pool = isGk ? keeperPool : playerPool;
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
              style={
                {
                  "--pos-x": `${pos.x}%`,
                  "--pos-y": `${pos.y}%`,
                } as React.CSSProperties
              }
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
                  while (newSelected.length <= idx) newSelected.push("");
                  newSelected[idx] = e.target.value;
                  setLineupSlots({ ...lineupSlots, [role]: [...newSelected] });
                }}
                className={`${styles.positionSelect} ${currentId ? styles.positionSelectFilled : ""}`}
              >
                <option value="" className={styles.selectOption}>
                  —
                </option>
                {pool.map((p) => {
                  const name = getSquadMemberName(p);
                  const jersey =
                    p.metadata?.shirt_number || p.data?.jersey_number;
                  const allUsedIds = [...gkSelected, ...playerSelected].filter(
                    Boolean,
                  );
                  const isAlreadyUsed =
                    !p.isGuest &&
                    allUsedIds.includes(p.id) &&
                    p.id !== currentId;
                  return (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={isAlreadyUsed}
                      className={
                        isAlreadyUsed
                          ? styles.selectOptionDisabled
                          : styles.selectOption
                      }
                    >
                      {jersey ? `#${jersey} ` : ""}
                      {name}
                      {p.isGuest ? " (gast)" : ""}
                      {isAlreadyUsed ? " ✗" : ""}
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
                {g.metadata?.shirt_number ? `#${g.metadata.shirt_number} ` : ""}
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
              onKeyDown={(e) => e.key === "Enter" && addGuestPlayer()}
              autoFocus
            />
            <input
              className={`${styles.guestInput} ${styles.guestInputSmall}`}
              placeholder="#"
              value={guestJersey}
              onChange={(e) => setGuestJersey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGuestPlayer()}
            />
            <button className={styles.guestAddBtn} onClick={addGuestPlayer}>
              Toevoegen
            </button>
            <button
              className={styles.guestCancelBtn}
              onClick={() => {
                setShowGuestForm(false);
                setGuestName("");
                setGuestJersey("");
              }}
            >
              Annuleren
            </button>
          </div>
        ) : (
          <button
            className={styles.addGuestBtn}
            onClick={() => setShowGuestForm(true)}
          >
            <UserPlus size={14} /> Gastspeler toevoegen
          </button>
        )}
      </div>

      {/* Summary bar + Save button */}
      <div
        className={`flex-between rounded-8 fs-13 w-full mx-auto ${styles.summaryBar}`}
      >
        <span className="text-secondary">
          Formatie: <strong className="text-primary">{lineupFormation}</strong>
          {" • "}
          {(() => {
            const filled = [...gkSelected, ...playerSelected].filter(
              Boolean,
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
            {lineupSaving ? "Opslaan..." : "Opstelling opslaan"}
          </button>
        </div>
      </div>

      {/* Bench: squad members not in lineup */}
      {(() => {
        const usedIds = new Set(
          [...gkSelected, ...playerSelected].filter(Boolean),
        );
        const benchMembers = allMembersDeduped.filter(
          (p) => !usedIds.has(p.id),
        );

        if (benchMembers.length === 0) return null;

        return (
          <div className={`w-full mx-auto ${styles.benchContainer}`}>
            <div className="fs-14 fw-700 mb-8 text-primary">
              Overige selectie ({benchMembers.length})
            </div>
            <div
              className={`flex-col gap-4 rounded-8 py-8 ${styles.benchPool}`}
            >
              {benchMembers.map((p) => {
                const name = getSquadMemberName(p);
                const jersey =
                  p.metadata?.shirt_number || p.data?.jersey_number;
                const status = lineupBenchStatus[p.id] || "";
                return (
                  <div
                    key={p.id}
                    className={`flex-between gap-8 ${styles.benchRow}`}
                  >
                    <span className="fs-13 fw-500 text-primary">
                      {jersey ? `#${jersey} ` : ""}
                      {name}
                    </span>
                    <div className="flex-row gap-4">
                      <button
                        onClick={() =>
                          setLineupBenchStatus((prev) => {
                            const next = { ...prev };
                            if (next[p.id] === "wissel") {
                              delete next[p.id];
                            } else {
                              next[p.id] = "wissel";
                            }
                            return next;
                          })
                        }
                        className={`${styles.benchButton} ${status === "wissel" ? styles.benchButtonWisselActive : ""}`}
                      >
                        Wissel
                      </button>
                      <button
                        onClick={() =>
                          setLineupBenchStatus((prev) => {
                            const next = { ...prev };
                            if (next[p.id] === "afwezig") {
                              delete next[p.id];
                            } else {
                              next[p.id] = "afwezig";
                            }
                            return next;
                          })
                        }
                        className={`${styles.benchButton} ${status === "afwezig" ? styles.benchButtonAfwezigActive : ""}`}
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
