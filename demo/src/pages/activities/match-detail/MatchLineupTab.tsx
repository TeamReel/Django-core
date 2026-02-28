import React from 'react';
import { Card } from '@django-core/design-system';
import { FormationPicker, FORMATION_LAYOUTS } from '../../identity/content-generation';

interface MatchLineupTabProps {
  lineupFormation: string;
  setLineupFormation: (formation: string) => void;
  lineupSlots: Record<string, string[]>;
  setLineupSlots: (slots: Record<string, string[]>) => void;
  lineupSquad: Record<string, any[]>;
  lineupSquadLoading: boolean;
  lineupBenchStatus: Record<string, string>;
  setLineupBenchStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lineupSaving: boolean;
  lineupSaveSuccess: boolean;
  saveLineup: () => Promise<void>;
}

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

export default function MatchLineupTab({
  lineupFormation,
  setLineupFormation,
  lineupSlots,
  setLineupSlots,
  lineupSquad,
  lineupSquadLoading,
  lineupBenchStatus,
  setLineupBenchStatus,
  lineupSaving,
  lineupSaveSuccess,
  saveLineup,
}: MatchLineupTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="⚽ Opstelling">
        <div
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Formation picker */}
          <FormationPicker
            selectedFormation={lineupFormation}
            onSelectFormation={setLineupFormation}
            label="Formatie"
          />

          {/* Field visualization */}
          {lineupSquadLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: 32,
                color: 'var(--app-text-secondary)',
              }}
            >
              Spelers laden...
            </div>
          ) : (
            <FieldVisualization
              lineupFormation={lineupFormation}
              lineupSlots={lineupSlots}
              setLineupSlots={setLineupSlots}
              lineupSquad={lineupSquad}
              lineupBenchStatus={lineupBenchStatus}
              setLineupBenchStatus={setLineupBenchStatus}
              lineupSaving={lineupSaving}
              lineupSaveSuccess={lineupSaveSuccess}
              saveLineup={saveLineup}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

/* ─── Field Visualization sub-component ─── */
interface FieldVisualizationProps {
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

function FieldVisualization({
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 500,
          aspectRatio: '3 / 4',
          margin: '0 auto',
          background: 'linear-gradient(to bottom, #16a34a, #15803d)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid var(--app-border, #333)',
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
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                zIndex: 10,
                minWidth: 70,
              }}
            >
              {/* Position label */}
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
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
                  width: 96,
                  padding: '3px 4px',
                  fontSize: 10,
                  fontWeight: currentId ? 700 : 400,
                  background: currentId
                    ? 'rgba(22,163,74,0.6)'
                    : 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: currentId
                    ? '2px solid rgba(255,255,255,0.7)'
                    : '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  outline: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.6)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 6px center',
                  paddingRight: 20,
                }}
              >
                <option
                  value=""
                  style={{ background: '#1e1e1e', color: '#ccc' }}
                >
                  — Kies —
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
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#fff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    maxWidth: 90,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  {jerseyNumber ? `#${jerseyNumber} ` : ''}
                  {getSquadMemberName(currentMember)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar + Save button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: 'var(--app-surface-secondary, #2a2a2a)',
          borderRadius: 8,
          fontSize: 13,
          maxWidth: 500,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <span style={{ color: 'var(--app-text-secondary, #999)' }}>
          Formatie:{' '}
          <strong style={{ color: 'var(--app-text, #ccc)' }}>
            {lineupFormation}
          </strong>
          {' • '}
          {(() => {
            const filled = [...gkSelected, ...playerSelected].filter(
              Boolean
            ).length;
            const total = formationLayout.positions.length;
            return filled === total ? (
              <span style={{ color: '#10b981' }}>
                ✓ Alle {total} posities ingevuld
              </span>
            ) : (
              <span>
                {filled} / {total} posities
              </span>
            );
          })()}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {lineupSaveSuccess && (
            <span
              style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}
            >
              ✓ Opgeslagen!
            </span>
          )}
          <button
            onClick={saveLineup}
            disabled={lineupSaving}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: lineupSaving ? 'not-allowed' : 'pointer',
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
            style={{
              maxWidth: 500,
              margin: '0 auto',
              width: '100%',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--app-text, #ccc)',
                marginBottom: 8,
              }}
            >
              Overige selectie ({benchMembers.length})
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                background: 'var(--app-surface-secondary, #2a2a2a)',
                borderRadius: 8,
                padding: '8px 0',
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 14px',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--app-text, #ccc)',
                        fontWeight: 500,
                      }}
                    >
                      {jersey ? `#${jersey} ` : ''}
                      {name}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
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
                              ? '#f59e0b'
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
                              ? '#ef4444'
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
