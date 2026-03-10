/**
 * LineupStep – Step 3: Edit lineup positions
 */
import React, { useState, useEffect } from 'react';
import { ChevronRight, AlertTriangle, RefreshCw, UserPlus, X } from 'lucide-react';
import { useWizard } from '../../Wizard';
import { useMatchWizard } from '../MatchWizardContext';
import { useSquadData } from '../hooks';
import SmartEmptyState from '../../SmartEmptyState';
import { POSITIONS, getSquadMemberName, HAS_OPTIONS_SUBTYPES } from '../types';
import styles from '../MatchWizardV2.module.css';

export function LineupStep() {
  const { goTo } = useWizard();
  const {
    lineupSlots,
    squadLoading,
    squadError,
    allPlayers,
    guestPlayers,
    filledPositions,
    totalPositions,
    handleSelectPlayer,
    addGuestPlayer,
    removeGuestPlayer,
    pendingContent,
  } = useMatchWizard();

  const { fetchSquad, loadSavedLineup, saveLineup } = useSquadData();
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestJersey, setGuestJersey] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch squad and load saved lineup on mount
  useEffect(() => {
    fetchSquad();
    loadSavedLineup();
  }, [fetchSquad, loadSavedLineup]);

  const handleAddGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    addGuestPlayer(name, guestJersey.trim() || undefined);
    setGuestName('');
    setGuestJersey('');
    setShowGuestForm(false);
  };

  const handleContinue = async () => {
    setSaving(true);
    await saveLineup();
    setSaving(false);

    // Navigate based on content requirements
    if (pendingContent && HAS_OPTIONS_SUBTYPES.has(pendingContent.subtype)) {
      goTo('options');
    } else {
      goTo('review');
    }
  };

  const usedMemberIds = [...(lineupSlots.goalkeeper || []), ...(lineupSlots.player || [])].filter(Boolean);

  const getMemberName = (memberId: string) => {
    const member = allPlayers.find(m => m.id === memberId);
    return member ? getSquadMemberName(member) : 'Onbekend';
  };

  const getMemberJersey = (memberId: string) => {
    const member = allPlayers.find(m => m.id === memberId);
    const j = member?.metadata?.shirt_number || member?.data?.jersey_number;
    return j ? String(j) : null;
  };

  return (
    <div className="flex-col gap-8">
      {/* Progress indicator */}
      <div className="flex-between mb-8">
        <span className="fs-14 text-muted">
          {filledPositions} / {totalPositions} posities
        </span>
        <div className={styles.progressBarTrack}>
          <div
            className={styles.progressBarFill}
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
          <button onClick={fetchSquad} className={styles.retryBtn}>
            <RefreshCw size={16} />Opnieuw
          </button>
        </div>
      ) : squadLoading ? (
        <div className="text-center p-32 text-muted">Spelers laden...</div>
      ) : allPlayers.length === 0 && guestPlayers.length === 0 ? (
        <SmartEmptyState type="members" compact hideActions description="Geen spelers gevonden in het team." />
      ) : (
        <div className="flex-col gap-6">
          {/* Guest player management */}
          {guestPlayers.length > 0 && (
            <div className={styles.guestSection}>
              <div className="fs-12 fw-600 uppercase text-muted">Gasten</div>
              <div className={`flex-row gap-6 ${styles.flexWrap}`}>
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
              <div className={`fw-600 fs-13 text-primary ${styles.guestFormHeader}`}>Gast toevoegen</div>
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
                />
              </div>
              <div className={`flex-row gap-8 ${styles.guestFormActions}`}>
                <button onClick={handleAddGuest} disabled={!guestName.trim()} className={styles.guestAddBtn}>
                  Toevoegen
                </button>
                <button onClick={() => { setShowGuestForm(false); setGuestName(''); setGuestJersey(''); }} className={styles.guestCancelBtn}>
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowGuestForm(true)} className={styles.addGuestBtn}>
              <UserPlus size={16} />
              <span>Gast toevoegen</span>
            </button>
          )}

          {/* Position slots */}
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
                  <div className="flex-between mb-8">
                    <span className="fw-600 text-primary">{posConfig.fullLabel} ({posConfig.label})</span>
                    <button
                      onClick={() => setEditingPosition(null)}
                      className="fs-12 rounded-6 bg-transparent border cursor-pointer px-8 py-4"
                    >
                      Annuleren
                    </button>
                  </div>
                  <div className={`flex-col gap-4 overflow-y-auto ${styles.playerOptionsScroll}`}>
                    <button
                      onClick={() => { handleSelectPlayer(positionIdx, isGoalkeeper, null); setEditingPosition(null); }}
                      className={styles.playerOption}
                    >
                      — Geen speler —
                    </button>
                    {allPlayers.map((member) => {
                      const isUsed = !member.isGuest && usedMemberIds.includes(member.id) && member.id !== memberId;
                      const jersey = member.metadata?.shirt_number || member.data?.jersey_number;
                      return (
                        <button
                          key={member.id}
                          onClick={() => { if (!isUsed) { handleSelectPlayer(positionIdx, isGoalkeeper, member.id); setEditingPosition(null); } }}
                          className={styles.playerOption}
                          data-disabled={isUsed}
                          data-selected={member.id === memberId}
                        >
                          {jersey && <span className={styles.playerJersey}>#{jersey}</span>}
                          <span className={isUsed ? 'text-muted' : ''}>{getSquadMemberName(member)}</span>
                          {member.isGuest && <span className={styles.guestBadge}>Gast</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <button
                key={posConfig.slot}
                onClick={() => setEditingPosition(posConfig.slot)}
                className={styles.positionSlot}
                data-filled={!!memberId}
              >
                <span className={styles.positionLabel}>{posConfig.label}</span>
                <span className="flex-1 text-left">
                  {memberId ? (
                    <>
                      {getMemberJersey(memberId) && <span className={styles.playerJersey}>#{getMemberJersey(memberId)}</span>}
                      {getMemberName(memberId)}
                    </>
                  ) : (
                    <span className="text-muted">Selecteer speler</span>
                  )}
                </span>
                <ChevronRight size={18} className="text-muted" />
              </button>
            );
          })}
        </div>
      )}

      {/* Continue button */}
      <div className={styles.stepActions}>
        <button
          onClick={handleContinue}
          disabled={saving}
          className={`w-full rounded-12 border-none fw-600 cursor-pointer flex-center gap-8 text-white fs-15 ${styles.primaryBtn}`}
        >
          {saving ? 'Opslaan...' : 'Verder'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
