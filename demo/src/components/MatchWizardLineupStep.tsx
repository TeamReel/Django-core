/**
 * MatchWizardLineupStep — Step 3: position-by-position lineup editor.
 * Supports guest players that can be added ad-hoc and used in multiple positions.
 */
import React, { useState } from 'react';
import { ChevronRight, AlertTriangle, RefreshCw, UserPlus, X } from 'lucide-react';
import SmartEmptyState from './SmartEmptyState';
import { POSITIONS, getSquadMemberName, type SquadMember } from './matchWizardTypes';
import type { useMatchWizardData } from './useMatchWizardData';
import styles from './MatchWizardLineupStep.module.css';

type Data = ReturnType<typeof useMatchWizardData>;

export function MatchWizardLineupStep({ d }: { d: Data }) {
  const {
    lineupSlots, squadLoading, editingPosition, setEditingPosition,
    filledPositions, totalPositions, allPlayers,
    handleSelectPlayer, getMemberName, getMemberJersey,
    squadError, retrySquad,
    guestPlayers, addGuestPlayer, removeGuestPlayer,
  } = d;

  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestJersey, setGuestJersey] = useState('');

  const handleAddGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    addGuestPlayer(name, guestJersey.trim() || undefined);
    setGuestName('');
    setGuestJersey('');
    setShowGuestForm(false);
  };

  const usedMemberIds = [...(lineupSlots.goalkeeper || []), ...(lineupSlots.player || [])].filter(Boolean);

  return (
    <div className="flex-col gap-8">
      {/* Progress indicator */}
      <div className="flex-between mb-8">
        <span className={`fs-14 ${styles.textMuted}`}>
          {filledPositions} / {totalPositions} posities
        </span>
        <div className={`overflow-hidden ${styles.progressBarTrack}`}>
          <div
            className={`h-full ${styles.progressBarFill}`}
            data-complete={filledPositions === totalPositions ? 'true' : undefined}
            style={{ width: `${(filledPositions / totalPositions) * 100}%` }}
          />
        </div>
      </div>

      {squadError ? (
        <div className={styles.errorBanner}>
          <AlertTriangle size={20} className={styles.errorIcon} />
          <div className="flex-1-min">
            <div className="fw-600 fs-14 text-primary">Fout bij laden</div>
            <div className="fs-13 text-muted">{squadError}</div>
          </div>
          <button onClick={retrySquad} className={styles.retryBtn}>
            <RefreshCw size={16} />Opnieuw
          </button>
        </div>
      ) : squadLoading ? (
        <div className={`text-center p-32 ${styles.textMuted}`}>Spelers laden...</div>
      ) : allPlayers.length === 0 && guestPlayers.length === 0 ? (
        <SmartEmptyState type="members" compact hideActions description="Geen spelers gevonden in het team." />
      ) : (
        <div className="flex-col gap-6">
          {/* ── Guest player management ── */}
          {guestPlayers.length > 0 && (
            <div className={styles.guestSection}>
              <div className={`fs-12 fw-600 uppercase ${styles.guestSectionLabel}`}>Gasten</div>
              <div className="flex-row gap-6" style={{ flexWrap: 'wrap' }}>
                {guestPlayers.map(g => (
                  <span key={g.id} className={styles.guestTag}>
                    {g.metadata?.shirt_number && <span className={styles.guestTagJersey}>#{g.metadata.shirt_number}</span>}
                    {getSquadMemberName(g)}
                    <button onClick={() => removeGuestPlayer(g.id)} className={styles.guestTagRemove} aria-label="Verwijder gast">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {showGuestForm ? (
            <div className={styles.guestForm}>
              <div className="fw-600 fs-13 text-primary" style={{ marginBottom: 'var(--space-2)' }}>Gast toevoegen</div>
              <div className="flex-row gap-8">
                <input
                  className={styles.guestInput}
                  placeholder="Naam"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddGuest()}
                  autoFocus
                />
                <input
                  className={`${styles.guestInput} ${styles.guestInputSmall}`}
                  placeholder="#"
                  value={guestJersey}
                  onChange={e => setGuestJersey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddGuest()}
                  style={{ maxWidth: 56 }}
                />
              </div>
              <div className="flex-row gap-8" style={{ marginTop: 'var(--space-2)' }}>
                <button onClick={handleAddGuest} disabled={!guestName.trim()} className={styles.guestAddBtn}>Toevoegen</button>
                <button onClick={() => { setShowGuestForm(false); setGuestName(''); setGuestJersey(''); }} className={styles.guestCancelBtn}>Annuleren</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowGuestForm(true)} className={styles.addGuestBtn}>
              <UserPlus size={16} />
              <span>Gast toevoegen</span>
            </button>
          )}

          {POSITIONS.map((posConfig) => {
            const isGoalkeeper = posConfig.slot === 1;
            const positionIdx = isGoalkeeper ? 0 : posConfig.slot - 2;
            const memberId = isGoalkeeper
              ? lineupSlots.goalkeeper[0] || null
              : lineupSlots.player[positionIdx] || null;
            const isEditing = editingPosition === posConfig.slot;

            if (isEditing) {
              return (
                <div key={posConfig.slot} className="bg-surface-2 rounded-12 p-12">
                  <div className={`flex-between ${styles.editingHeader}`}>
                    <span className="fw-600 text-primary">{posConfig.fullLabel} ({posConfig.label})</span>
                    <button onClick={() => setEditingPosition(null)}
                      className={`fs-12 rounded-6 bg-transparent border cursor-pointer ${styles.cancelButton}`}>
                      Annuleren
                    </button>
                  </div>
                  <div className={`flex-col gap-4 overflow-y-auto ${styles.playerList}`}>
                    <button onClick={() => handleSelectPlayer(positionIdx, isGoalkeeper, null)}
                      className={`fs-14 ${styles.emptyPlayerButton}`}>
                      — Geen speler —
                    </button>
                    {allPlayers.map((member) => {
                      // Guests can be used in multiple positions
                      const isUsed = !member.isGuest && usedMemberIds.includes(member.id) && member.id !== memberId;
                      const jersey = member.metadata?.shirt_number || member.data?.jersey_number;
                      return (
                        <button key={member.id}
                          onClick={() => !isUsed && handleSelectPlayer(positionIdx, isGoalkeeper, member.id)}
                          disabled={isUsed}
                          className={styles.playerButton}
                          data-selected={member.id === memberId ? 'true' : undefined}
                          data-used={isUsed ? 'true' : undefined}
                          data-guest={member.isGuest ? 'true' : undefined}>
                          {jersey && (
                            <span
                              className={`rounded-full flex-center fs-11 fw-600 ${styles.jerseyBadge}`}
                              data-selected={member.id === memberId ? 'true' : undefined}
                            >{jersey}</span>
                          )}
                          <span className="flex-1">{getSquadMemberName(member)}</span>
                          {member.isGuest && <span className={styles.guestBadge}>gast</span>}
                          {isUsed && <span className="fs-11 opacity-70">ingevuld</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <button key={posConfig.slot} onClick={() => setEditingPosition(posConfig.slot)}
                className={styles.positionButton}
                data-filled={memberId ? 'true' : 'false'}>
                <div
                  className={`rounded-8 flex-center fs-11 fw-700 ${styles.positionBadge}`}
                  data-filled={memberId ? 'true' : 'false'}
                >{posConfig.label}</div>
                <div className="flex-1-min">
                  {memberId ? (
                    <>
                      <div className="fw-600 fs-14 text-primary">
                        {getMemberName(memberId)}
                        {allPlayers.find(m => m.id === memberId)?.isGuest && (
                          <span className={styles.guestBadgeInline}>gast</span>
                        )}
                      </div>
                      <div className={`fs-12 ${styles.textMuted}`}>
                        {getMemberJersey(memberId) && `#${getMemberJersey(memberId)} \u00b7 `}{posConfig.fullLabel}
                      </div>
                    </>
                  ) : (
                    <div className={`fs-14 ${styles.textMuted}`}>{posConfig.fullLabel}</div>
                  )}
                </div>
                <ChevronRight size={18} className={styles.chevronIcon} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
