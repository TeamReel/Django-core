/**
 * QuickCreateFAB - Floating Action Button for quick content creation
 *
 * Shows a + button on mobile that opens the MatchWizard for a complete
 * match preparation flow: select match → lineup → content creation.
 */
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import MatchWizard from './MatchWizard';

interface QuickCreateFABProps {
  /** Organisation ID for filtering activities */
  organisationId?: string;
  /** Project/Team ID for filtering activities */
  projectId?: string;
  /** Initial match ID to preselect */
  initialMatchId?: string;
}

export default function QuickCreateFAB({ initialMatchId }: QuickCreateFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for custom event to open the FAB (from SmartEmptyState or swipe-up)
  useEffect(() => {
    const handleOpenQuickCreate = () => setIsOpen(true);
    window.addEventListener('teamreel:open-quick-create', handleOpenQuickCreate);
    return () => window.removeEventListener('teamreel:open-quick-create', handleOpenQuickCreate);
  }, []);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Wedstrijd wizard"
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', // Above bottom nav
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--app-primary, #3B8EA5)',
          color: 'white',
          border: 'none',
          boxShadow: 'var(--shadow-lg)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
        }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* Match Wizard */}
      <MatchWizard
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialMatchId={initialMatchId}
      />
    </>
  );
}
