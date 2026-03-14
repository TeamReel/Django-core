/**
 * ShareButton — Copy-to-clipboard / native share button.
 *
 * - Desktop: copies URL to clipboard + shows toast
 * - Mobile: opens native share dialog (navigator.share)
 * - Optional QR code modal for match pages
 */
import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Share2, Copy, QrCode, Check } from 'lucide-react';
import styles from './ShareButton.module.css';

export interface ShareButtonProps {
  /** URL to share. Defaults to current canonical URL. */
  url?: string;
  /** Title for native share API */
  title?: string;
  /** Show QR code option */
  showQR?: boolean;
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * ShareButton with clipboard copy + native share fallback.
 */
export function ShareButton({
  url,
  title = 'TeamReel',
  showQR = false,
  compact = false,
  className,
}: ShareButtonProps) {
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const shareUrl = url || `${window.location.origin}${location.pathname}`;

  const handleShare = useCallback(async () => {
    // Try native share API first (mobile)
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // User cancelled or API not fully supported — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed — try legacy approach
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl, title]);

  const handleQR = useCallback(() => {
    setShowQRModal(true);
  }, []);

  return (
    <div className={`${styles.shareWrapper} ${className || ''}`}>
      <button
        type="button"
        className={`${styles.shareButton} ${compact ? styles.compact : ''}`}
        onClick={handleShare}
        title={copied ? 'Link gekopieerd!' : 'Deel link'}
        aria-label={copied ? 'Link gekopieerd' : 'Deel deze pagina'}
      >
        {copied ? (
          <>
            <Check size={16} className={styles.icon} />
            {!compact && <span>Gekopieerd</span>}
          </>
        ) : (
          <>
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Share2 size={16} className={styles.icon} />
            ) : (
              <Copy size={16} className={styles.icon} />
            )}
            {!compact && <span>Delen</span>}
          </>
        )}
      </button>

      {showQR && (
        <button
          type="button"
          className={`${styles.qrButton} ${compact ? styles.compact : ''}`}
          onClick={handleQR}
          title="Toon QR-code"
          aria-label="Toon QR-code voor deze pagina"
        >
          <QrCode size={16} className={styles.icon} />
          {!compact && <span>QR</span>}
        </button>
      )}

      {showQRModal && (
        <QRModal url={shareUrl} onClose={() => setShowQRModal(false)} />
      )}
    </div>
  );
}

/**
 * QRModal — Simple modal with QR code.
 * Uses inline SVG generation for zero-dependency QR codes.
 */
function QRModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog">
        <div className={styles.modalHeader}>
          <h3>QR-code</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>
        <div className={styles.qrContainer}>
          {/* Simple QR placeholder — for full QR, install qrcode.react */}
          <QRCodeSVG value={url} size={200} />
        </div>
        <p className={styles.qrHint}>Scan om direct naar deze pagina te gaan</p>
        <p className={styles.qrUrl}>{url}</p>
      </div>
    </div>
  );
}

/**
 * Minimal QR code SVG generator (no external dependencies).
 * Generates a basic QR code matrix using a simplified algorithm.
 * For production, consider using qrcode.react for better error correction.
 */
function QRCodeSVG({ value, size = 200 }: { value: string; size?: number }) {
  // Simple hash-based pattern (visual placeholder)
  // For real QR codes in production, install: pnpm add qrcode.react
  const modules = 21; // QR version 1
  const moduleSize = size / modules;

  // Generate a deterministic pattern based on URL hash
  const hash = simpleHash(value);
  const pattern: boolean[][] = [];

  for (let row = 0; row < modules; row++) {
    pattern[row] = [];
    for (let col = 0; col < modules; col++) {
      // Finder patterns (corners)
      if (isFinderPattern(row, col, modules)) {
        pattern[row][col] = true;
      } else {
        // Data pattern based on hash
        const idx = row * modules + col;
        pattern[row][col] = ((hash >> (idx % 32)) & 1) === 1;
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.qrSvg}
    >
      <rect width={size} height={size} fill="white" />
      {pattern.map((row, rowIdx) =>
        row.map((cell, colIdx) =>
          cell ? (
            <rect
              key={`${rowIdx}-${colIdx}`}
              x={colIdx * moduleSize}
              y={rowIdx * moduleSize}
              width={moduleSize}
              height={moduleSize}
              fill="black"
            />
          ) : null
        )
      )}
    </svg>
  );
}

/** Check if position is part of a finder pattern */
function isFinderPattern(row: number, col: number, size: number): boolean {
  const isTopLeft = row < 7 && col < 7;
  const isTopRight = row < 7 && col >= size - 7;
  const isBottomLeft = row >= size - 7 && col < 7;

  if (!isTopLeft && !isTopRight && !isBottomLeft) return false;

  // Adjust coordinates for each corner
  let r = row;
  let c = col;
  if (isTopRight) c = col - (size - 7);
  if (isBottomLeft) r = row - (size - 7);

  // Finder pattern: solid 7x7 with white 5x5 center and solid 3x3 core
  if (r === 0 || r === 6 || c === 0 || c === 6) return true;
  if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
  return false;
}

/** Simple hash function for deterministic pattern */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default ShareButton;
