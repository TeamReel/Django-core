/**
 * GalleryCreateContentButton — Quick-create content from gallery
 *
 * Extracted from ContentLibraryPage.tsx for file-size compliance.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelection } from '../../hooks/useAppSelection';
import { useUserRole } from '../../components/PermissionGuards';

const GALLERY_QUICK_TYPES = [
  { key: 'flyer', label: 'Match Flyer', icon: '📣', desc: 'Wedstrijdposter voor social media' },
  { key: 'lineup', label: 'Lineup', icon: '📋', desc: 'Opstelling met foto\'s en formatie' },
  { key: 'walkon', label: 'Walk-on Video', icon: '🚶', desc: 'Intro video met spelersnamen' },
  { key: 'anthem', label: 'Anthem Video', icon: '🎵', desc: 'Anthem of clublied video' },
  { key: 'goal', label: 'Goal Celebration', icon: '⚽', desc: 'Doelpunt viering animatie' },
  { key: 'end_score', label: 'Final Score', icon: '🏁', desc: 'Eindstand graphic' },
  { key: 'highlights', label: 'Highlights', icon: '🎬', desc: 'Hoogtepunten compilatie' },
];

export function GalleryCreateContentButton() {
  const navigate = useNavigate();
  const { matchId } = useAppSelection();
  const { isPlayer } = useUserRole();
  const [showModal, setShowModal] = useState(false);

  if (isPlayer) return null;

  if (!matchId) {
    return (
      <span className="hide-mobile fs-12 text-muted whitespace-nowrap">
        Set a match active to create content
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex-row gap-6 rounded-8 border-none fs-14 fw-600 cursor-pointer whitespace-nowrap py-8 px-16"
        style={{ background: 'var(--app-primary, #3b82f6)', color: '#fff' }}
      >
        + Create
      </button>

      {showModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowModal(false)}
          />
          <div style={{
            position: 'fixed', zIndex: 999,
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--app-surface)', borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            width: 'min(420px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
            padding: '24px 20px',
          }}>
            <div className="flex-between mb-16">
              <h3 className="m-0 fs-18 fw-700 text-primary">Content aanmaken</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="bg-transparent border-none fs-20 cursor-pointer text-muted p-4"
                style={{ lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            <p className="m-0 mb-16 fs-13 text-muted">
              Kies het type content dat je wilt genereren voor de actieve wedstrijd.
            </p>
            <div className="flex-col gap-8">
              {GALLERY_QUICK_TYPES.map((ct) => (
                <button
                  key={ct.key}
                  onClick={() => {
                    setShowModal(false);
                    navigate(`/matches/${matchId}?tab=content`);
                  }}
                  className="flex-row gap-12 w-full cursor-pointer text-left border"
                  style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: 'var(--app-surface)', transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--app-surface-2)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'var(--app-surface)')}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{ct.icon}</span>
                  <div>
                    <div className="fs-14 fw-600 text-primary">{ct.label}</div>
                    <div className="fs-12 text-muted" style={{ marginTop: 2 }}>{ct.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
