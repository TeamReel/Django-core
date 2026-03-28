import React from 'react';
import { Card } from '@django-core/design-system';
import { FormationPicker } from '../../identity/content-generation';
import { FieldVisualization, type SquadMember } from './MatchLineupField';

interface MatchLineupTabProps {
  lineupFormation: string;
  setLineupFormation: (formation: string) => void;
  lineupSlots: Record<string, string[]>;
  setLineupSlots: (slots: Record<string, string[]>) => void;
  lineupSquad: Record<string, SquadMember[]>;
  lineupSquadLoading: boolean;
  lineupBenchStatus: Record<string, string>;
  setLineupBenchStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  lineupSaving: boolean;
  lineupSaveSuccess: boolean;
  saveLineup: () => Promise<void>;
}

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
    <div className="flex-col gap-16">
      <Card title="Opstelling">
        <div className="p-16 flex-col gap-16">
          {/* Formation picker */}
          <FormationPicker
            selectedFormation={lineupFormation}
            onSelectFormation={setLineupFormation}
            label="Formatie"
          />

          {/* Field visualization */}
          {lineupSquadLoading ? (
            <div className="text-center p-32 text-secondary">
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
