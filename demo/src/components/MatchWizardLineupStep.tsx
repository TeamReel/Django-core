/**
 * MatchWizardLineupStep — Step 3: position-by-position lineup editor.
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { POSITIONS, CARD_STYLE, getSquadMemberName, type SquadMember } from './matchWizardTypes';
import type { useMatchWizardData } from './useMatchWizardData';

type Data = ReturnType<typeof useMatchWizardData>;

export function MatchWizardLineupStep({ d }: { d: Data }) {
  const {
    lineupSlots, squadLoading, editingPosition, setEditingPosition,
    filledPositions, totalPositions, allPlayers,
    handleSelectPlayer, getMemberName, getMemberJersey,
  } = d;

  const usedMemberIds = [...(lineupSlots.goalkeeper || []), ...(lineupSlots.player || [])].filter(Boolean);

  return (
    <div className="flex-col gap-8">
      {/* Progress indicator */}
      <div className="flex-between mb-8">
        <span className="fs-14" style={{ color: 'var(--app-text-muted)' }}>
          {filledPositions} / {totalPositions} posities
        </span>
        <div className="overflow-hidden" style={{ width: '100px', height: '4px', backgroundColor: 'var(--app-border)', borderRadius: '2px' }}>
          <div className="h-full" style={{
            width: `${(filledPositions / totalPositions) * 100}%`,
            backgroundColor: filledPositions === totalPositions ? 'var(--color-success)' : 'var(--app-primary)',
            transition: 'width 0.2s ease',
          }} />
        </div>
      </div>

      {squadLoading ? (
        <div className="text-center p-32" style={{ color: 'var(--app-text-muted)' }}>Spelers laden...</div>
      ) : allPlayers.length === 0 ? (
        <div className="text-center p-32" style={{ color: 'var(--app-text-muted)' }}>Geen spelers gevonden in het team</div>
      ) : (
        <div className="flex-col gap-6">
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
                  <div className="flex-between" style={{ marginBottom: '10px' }}>
                    <span className="fw-600 text-primary">{posConfig.fullLabel} ({posConfig.label})</span>
                    <button onClick={() => setEditingPosition(null)}
                      className="fs-12 rounded-6 bg-transparent border cursor-pointer" style={{ padding: '4px 12px', color: 'var(--app-text-muted)' }}>
                      Annuleren
                    </button>
                  </div>
                  <div className="flex-col gap-4 overflow-y-auto" style={{ maxHeight: '180px' }}>
                    <button onClick={() => handleSelectPlayer(positionIdx, isGoalkeeper, null)} className="fs-14"
                      style={{ ...CARD_STYLE, padding: '10px 12px', color: 'var(--app-text-muted)' }}>
                      — Geen speler —
                    </button>
                    {allPlayers.map((member) => {
                      const isUsed = usedMemberIds.includes(member.id) && member.id !== memberId;
                      const jersey = member.metadata?.shirt_number || member.data?.jersey_number;
                      return (
                        <button key={member.id}
                          onClick={() => !isUsed && handleSelectPlayer(positionIdx, isGoalkeeper, member.id)}
                          disabled={isUsed}
                          style={{
                            ...CARD_STYLE, padding: '10px 12px',
                            backgroundColor: member.id === memberId ? 'var(--app-primary)' : CARD_STYLE.backgroundColor,
                            color: member.id === memberId ? 'white' : isUsed ? 'var(--app-text-muted)' : 'var(--app-text)',
                            cursor: isUsed ? 'not-allowed' : 'pointer',
                            opacity: isUsed ? 0.5 : 1,
                          }}>
                          {jersey && (
                            <span className="rounded-full flex-center fs-11 fw-600" style={{
                              width: '26px', height: '26px',
                              backgroundColor: member.id === memberId ? 'rgba(255,255,255,0.3)' : 'var(--app-surface-2)',
                              flexShrink: 0,
                            }}>{jersey}</span>
                          )}
                          <span className="flex-1">{getSquadMemberName(member)}</span>
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
                style={{ ...CARD_STYLE, backgroundColor: memberId ? 'var(--app-surface)' : 'var(--app-surface-2)' }}>
                <div className="rounded-8 flex-center fs-11 fw-700" style={{
                  width: '34px', height: '34px', flexShrink: 0,
                  backgroundColor: memberId ? 'var(--color-success)' : 'var(--app-border)',
                  color: memberId ? 'white' : 'var(--app-text-muted)',
                }}>{posConfig.label}</div>
                <div className="flex-1-min">
                  {memberId ? (
                    <>
                      <div className="fw-600 fs-14 text-primary">{getMemberName(memberId)}</div>
                      <div className="fs-12" style={{ color: 'var(--app-text-muted)' }}>
                        {getMemberJersey(memberId) && `#${getMemberJersey(memberId)} \u00b7 `}{posConfig.fullLabel}
                      </div>
                    </>
                  ) : (
                    <div className="fs-14" style={{ color: 'var(--app-text-muted)' }}>{posConfig.fullLabel}</div>
                  )}
                </div>
                <ChevronRight size={18} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
