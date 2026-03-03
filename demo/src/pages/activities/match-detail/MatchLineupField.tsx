import React from 'react';
import { FORMATION_LAYOUTS } from '../../identity/content-generation';

const getSquadMemberName = (p: any): string => {
  const user = p.user || p.member;
  if (!user) return 'Unknown';
  if (user.name) return user.name;
  if (user.user_name) return user.user_name;
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (full) return full;
  if (user.email) return user.email;
  return 'Unknown';
};

const getUserKey = (p: any): string => {
  const user = p.user || p.member;
  if (user?.id) return String(user.id);
  return String(p.id);
};

export interface FieldVisualizationProps {
  lineupFormation: string;
  lineupSlots: Record<string, string[]>;
  setLineupSlots: (slots: Record<string, string[]>) => void;
  lineupSquad: Record<string, any[]>;
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

  const gkPool = (lineupSquad.goalkeeper || []).filter(
    (p: any, idx: number, arr: any[]) =>
      arr.findIndex((x: any) => getUserKey(x) === getUserKey(p)) === idx
  );
  const playersOnly = [
    ...(lineupSquad.goalkeeper || []),
    ...(lineupSquad.player || []),
  ];
  const gkUserKeys = new Set(gkPool.map((p: any) => getUserKey(p)));
  const playerPool = playersOnly
    .filter((p: any) => !gkUserKeys.has(getUserKey(p)))
    .filter(
      (p: any, idx: number, arr: any[]) =>
        arr.findIndex((x: any) => getUserKey(x) === getUserKey(p)) === idx
    );

  const gkSelected = lineupSlots.goalkeeper || [];
  const playerSelected = lineupSlots.player || [];

  return (
    <div className="flex-col gap-16">
      <div
        className="relative w-full overflow-hidden rounded-12 mx-auto border"
        style={{
          maxWidth: 500,
          aspectRatio: '3 / 4',
          background: 'linear-gradient(to bottom, #16a34a, #15803d)',
        }}
      >
        {/* Field markings */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            top: '15%',
            height: 1,
            background: 'rgba(255,255,255,0.2)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            top: '50%',
            height: 1,
            background: 'rgba(255,255,255,0.2)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 48,
            height: 48,
            transform: 'translate(-50%, -50%)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '22%',
            right: '22%',
            bottom: 0,
            height: '14%',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            borderRight: '1px solid rgba(255,255,255,0.2)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '22%',
            right: '22%',
            top: 0,
            height: '14%',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            borderRight: '1px solid rgba(255,255,255,0.2)',
          }}
        />

        {/* Position nodes */}
        {formationLayout.positions.map((pos) => {
          const isGk = pos.slot === 1;
          const role = isGk ? 'goalkeeper' : 'player';
          const idx = isGk ? 0 : pos.slot - 2;
          const selected = isGk ? gkSelected : playerSelected;
          const currentId = selected[idx] || '';
          const pool = isGk ? gkPool : playerPool;
          const currentMember = currentId
            ? pool.find((p: any) => p.id === currentId)
            : null;
          const jerseyNumber =
            currentMember?.metadata?.shirt_number ||
            currentMember?.data?.jersey_number;

          return (
            <div
              key={pos.slot}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%) scale(0.55)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0,
                zIndex: 10,
                width: 72,
              }}
            >
              {/* Position label */}
              <div
                className="fs-11 fw-700"
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                }}
              >
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
                style={{
                  width: 72,
                  maxWidth: 72,
                  height: 26,
                  padding: '0 2px',
                  fontSize: 11,
                  lineHeight: '24px',
                  fontWeight: currentId ? 700 : 400,
                  background: currentId
                    ? 'rgba(22,163,74,0.6)'
                    : 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: currentId
                    ? '1.5px solid rgba(255,255,255,0.7)'
                    : '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 4,
                  outline: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none' as any,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='rgba(255,255,255,0.5)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 3px center',
                  paddingRight: 13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                }}
              >
                <option
                  value=""
                  style={{ background: '#1e1e1e', color: '#ccc' }}
                >
                  —
                </option>
                {pool.map((p: any) => {
                  const name = getSquadMemberName(p);
                  const jersey =
                    p.metadata?.shirt_number || p.data?.jersey_number;
                  const allUsedIds = [...gkSelected, ...playerSelected].filter(
                    Boolean
                  );
                  const isAlreadyUsed =
                    allUsedIds.includes(p.id) && p.id !== currentId;
                  return (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={isAlreadyUsed}
                      style={{
                        background: '#1e1e1e',
                        color: isAlreadyUsed ? '#666' : '#ccc',
                      }}
                    >
                      {jersey ? `#${jersey} ` : ''}
                      {name}
                      {isAlreadyUsed ? ' ✗' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Selected name display */}
              {currentMember && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    maxWidth: 70,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    lineHeight: 1,
                    marginTop: 1,
                  }}
                >
                  {getSquadMemberName(currentMember)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar + Save button */}
      <div
        className="flex-between rounded-8 fs-13 w-full mx-auto"
        style={{
          padding: '10px 14px',
          background: 'var(--app-surface-secondary, #2a2a2a)',
          maxWidth: 500,
        }}
      >
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
              <span style={{ color: 'var(--color-green-400)' }}>
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
            <span
              className="fs-12 fw-600"
              style={{ color: 'var(--color-green-400)' }}
            >
              ✓ Opgeslagen!
            </span>
          )}
          <button
            onClick={saveLineup}
            disabled={lineupSaving}
            className="fs-13 fw-600 border-none rounded-6 text-white cursor-pointer"
            style={{
              padding: '8px 20px',
              background: '#16a34a',
              cursor: lineupSaving ? 'not-allowed' : undefined,
              opacity: lineupSaving ? 0.7 : 1,
            }}
          >
            {lineupSaving ? 'Opslaan...' : '💾 Opstelling opslaan'}
          </button>
        </div>
      </div>

      {/* Bench: squad members not in lineup */}
      {(() => {
        const allPool = [...gkPool, ...playerPool];
        const usedIds = new Set(
          [...gkSelected, ...playerSelected].filter(Boolean)
        );
        const benchMembers = allPool.filter(
          (p: any) => !usedIds.has(p.id)
        );

        if (benchMembers.length === 0) return null;

        return (
          <div
            className="w-full mx-auto"
            style={{ maxWidth: 500 }}
          >
            <div
              className="fs-14 fw-700 mb-8 text-primary"
            >
              Overige selectie ({benchMembers.length})
            </div>
            <div
              className="flex-col gap-4 rounded-8 py-8"
              style={{
                background: 'var(--app-surface-secondary, #2a2a2a)',
              }}
            >
              {benchMembers.map((p: any) => {
                const name = getSquadMemberName(p);
                const jersey =
                  p.metadata?.shirt_number || p.data?.jersey_number;
                const status = lineupBenchStatus[p.id] || '';
                return (
                  <div
                    key={p.id}
                    className="flex-between gap-8"
                    style={{ padding: '6px 14px' }}
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
                        style={{
                          padding: '3px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 4,
                          border:
                            status === 'wissel'
                              ? '2px solid #f59e0b'
                              : '1px solid var(--app-border, #444)',
                          background:
                            status === 'wissel'
                              ? 'rgba(245,158,11,0.15)'
                              : 'transparent',
                          color:
                            status === 'wissel'
                              ? 'var(--color-amber-400)'
                              : 'var(--app-text-secondary, #999)',
                          cursor: 'pointer',
                        }}
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
                        style={{
                          padding: '3px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 4,
                          border:
                            status === 'afwezig'
                              ? '2px solid #ef4444'
                              : '1px solid var(--app-border, #444)',
                          background:
                            status === 'afwezig'
                              ? 'rgba(239,68,68,0.15)'
                              : 'transparent',
                          color:
                            status === 'afwezig'
                              ? 'var(--color-red-500)'
                              : 'var(--app-text-secondary, #999)',
                          cursor: 'pointer',
                        }}
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
