import { useState } from 'react';
import type { SquadMember } from './matchLineupUtils';

export function useGuestPlayers(
  lineupSlots: Record<string, string[]>,
  setLineupSlots: (slots: Record<string, string[]>) => void,
) {
  const [guestPlayers, setGuestPlayers] = useState<SquadMember[]>([]);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestJersey, setGuestJersey] = useState('');

  const addGuestPlayer = () => {
    const name = guestName.trim();
    if (!name) return;
    const guest: SquadMember = {
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
    const newGk = (lineupSlots.goalkeeper || []).map((id) =>
      id === guestId ? '' : id,
    );
    const newPl = (lineupSlots.player || []).map((id) =>
      id === guestId ? '' : id,
    );
    setLineupSlots({ ...lineupSlots, goalkeeper: newGk, player: newPl });
  };

  return {
    guestPlayers,
    showGuestForm,
    setShowGuestForm,
    guestName,
    setGuestName,
    guestJersey,
    setGuestJersey,
    addGuestPlayer,
    removeGuestPlayer,
  };
}
