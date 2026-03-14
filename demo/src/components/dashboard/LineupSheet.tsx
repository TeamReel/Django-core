/**
 * LineupSheet — Inline lineup editing from the dashboard via NavigationSheet.
 *
 * Wraps the existing MatchLineupTab (FormationPicker + FieldVisualization)
 * in an iOS-like slide-up sheet so users can edit the lineup without
 * leaving the dashboard.
 */
import React, { lazy, Suspense } from 'react';
import { Users } from 'lucide-react';
import { NavigationSheet } from '../ui/NavigationSheet';
import { useLineupSheet } from './useLineupSheet';
import type { Match } from './ActiveMatchCard';

const MatchLineupTab = lazy(() =>
  import('../../pages/activities/match-detail/MatchLineupTab'),
);

interface LineupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  /** iOS-style back — returns to the parent (match) sheet */
  onBack?: () => void;
}

export const LineupSheet: React.FC<LineupSheetProps> = ({ isOpen, onClose, match, onBack }) => {
  const lineup = useLineupSheet(match);

  return (
    <NavigationSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Opstelling"
      icon={onBack ? undefined : <Users size={18} />}
      onBack={onBack}
    >
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--app-muted-text)' }}>Laden...</div>}>
        <MatchLineupTab
          lineupFormation={lineup.lineupFormation}
          setLineupFormation={lineup.setLineupFormation}
          lineupSlots={lineup.lineupSlots}
          setLineupSlots={lineup.setLineupSlots}
          lineupSquad={lineup.lineupSquad}
          lineupSquadLoading={lineup.lineupSquadLoading}
          lineupBenchStatus={lineup.lineupBenchStatus}
          setLineupBenchStatus={lineup.setLineupBenchStatus}
          lineupSaving={lineup.lineupSaving}
          lineupSaveSuccess={lineup.lineupSaveSuccess}
          saveLineup={lineup.saveLineup}
        />
      </Suspense>
    </NavigationSheet>
  );
};
