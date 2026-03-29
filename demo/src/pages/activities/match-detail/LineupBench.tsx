import React from 'react';
import { type SquadMember, getSquadMemberName } from './matchLineupUtils';
import styles from './MatchLineupField.module.css';

interface LineupBenchProps {
  benchMembers: SquadMember[];
  lineupBenchStatus: Record<string, string>;
  setLineupBenchStatus: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

export function LineupBench({
  benchMembers,
  lineupBenchStatus,
  setLineupBenchStatus,
}: LineupBenchProps) {
  if (benchMembers.length === 0) return null;

  return (
    <div className={`w-full mx-auto ${styles.benchContainer}`}>
      <div className="fs-14 fw-700 mb-8 text-primary">
        Overige selectie ({benchMembers.length})
      </div>
      <div className={`flex-col gap-4 rounded-8 py-8 ${styles.benchPool}`}>
        {benchMembers.map((p) => {
          const name = getSquadMemberName(p);
          const jersey = p.metadata?.shirt_number || p.data?.jersey_number;
          const status = lineupBenchStatus[p.id] || '';
          return (
            <div
              key={p.id}
              className={`flex-between gap-8 ${styles.benchRow}`}
            >
              <span className="fs-13 fw-500 text-primary">
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
}
