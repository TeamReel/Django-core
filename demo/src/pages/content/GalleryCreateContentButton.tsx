/**
 * GalleryCreateContentButton — Quick-create content from gallery
 *
 * Extracted from ContentLibraryPage.tsx for file-size compliance.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelection } from '../../hooks/useAppSelection';
import { routes } from '../../routes';
import { useUserRole } from '../../components/PermissionGuards';
import styles from './GalleryCreateContentButton.module.css';

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
        className={`flex-row gap-6 rounded-8 border-none fs-14 fw-600 cursor-pointer whitespace-nowrap py-8 px-16 ${styles.createBtn}`}
      >
        + Create
      </button>

      {showModal && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setShowModal(false)}
          />
          <div className={styles.modal}>
            <div className="flex-between mb-16">
              <h3 className="m-0 fs-18 fw-700 text-primary">Content aanmaken</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`bg-transparent border-none fs-20 cursor-pointer text-muted p-4 ${styles.closeBtn}`}
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
                    navigate(routes.matchWithTab({ matchId, tab: 'content' }));
                  }}
                  className={`flex-row gap-12 w-full cursor-pointer text-left border ${styles.typeBtn}`}
                >
                  <span className={styles.typeIcon}>{ct.icon}</span>
                  <div>
                    <div className="fs-14 fw-600 text-primary">{ct.label}</div>
                    <div className={`fs-12 text-muted ${styles.typeDesc}`}>{ct.desc}</div>
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
