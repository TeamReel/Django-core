/**
 * ShortcutGuide — Modal showing all registered keyboard shortcuts.
 *
 * Triggered by pressing `?` or clicking help icon.
 */
import React from 'react';
import { X } from 'lucide-react';
import { useShortcutRegistry, formatShortcutKey } from '../hooks/useKeyboardShortcuts';
import styles from './ShortcutGuide.module.css';

interface ShortcutGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutGuide({ isOpen, onClose }: ShortcutGuideProps) {
  const shortcuts = useShortcutRegistry();

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Sneltoetsen"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Sneltoetsen</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Sluiten"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {shortcuts.length === 0 ? (
            <p className={styles.empty}>Geen sneltoetsen geregistreerd.</p>
          ) : (
            <ul className={styles.list}>
              {shortcuts.map((s) => (
                <li key={`${s.key}-${s.meta}-${s.shift}`} className={styles.row}>
                  <span className={styles.description}>{s.description}</span>
                  <kbd className={styles.kbd}>{formatShortcutKey(s)}</kbd>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export default ShortcutGuide;
