/**
 * VariantCardStrip — Horizontal scroll of video variant cards.
 *
 * Shows one card per video variant (arms_crossed, thumbs_up, etc.)
 * with poster frame thumbnail, duration, and status badge.
 * Selecting a variant opens an inline video player below.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { iterVariants, type TeamreelAssets, type VariantValue } from '../../utils/assetMetadata';
import { getAssetUrl } from '../../hooks/brandProfileConstants';
import s from './VariantCardStrip.module.css';

/* ── Status helpers ── */
type VariantStatus = 'processed' | 'raw' | 'processing' | 'empty';

function deriveStatus(v: VariantValue | undefined): VariantStatus {
  if (!v) return 'empty';
  if (v.processing_state === 'processing') return 'processing';
  if (v.processed) return 'processed';
  if (v.raw) return 'raw';
  return 'empty';
}

const STATUS_LABELS: Record<VariantStatus, string> = {
  processed: 'Klaar',
  raw: 'Ruwe upload',
  processing: 'Bezig...',
  empty: 'Geen',
};

/* ── Variant name labels ── */
const VARIANT_LABELS: Record<string, string> = {
  arms_crossed: 'Arms crossed',
  thumbs_up: 'Thumbs up',
  walking: 'Walking',
  celebration: 'Celebration',
  default: 'Standaard',
};

/* ── Props ── */
interface VariantCardStripProps {
  assets: TeamreelAssets | undefined;
  role: string;
  assetType: string;
  /** Whether accordion is open — pause video when closed */
  isVisible: boolean;
}

interface VariantInfo {
  kit: string;
  variantId: string;
  value: VariantValue;
  status: VariantStatus;
  posterUrl: string | null;
  videoUrl: string | null;
}

export function VariantCardStrip({ assets, role, assetType, isVisible }: VariantCardStripProps) {
  const [activeVariant, setActiveVariant] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Collect all variants
  const variants: VariantInfo[] = [];
  const raw = iterVariants(assets, role, 'videos', assetType);
  for (const v of raw) {
    if (!v.value) continue;
    const val = v.value as VariantValue & Record<string, unknown>;
    const status = deriveStatus(v.value);
    const posterUrl = (val.preview_url as string | undefined)
      ? getAssetUrl(val.preview_url as string)
      : null;
    const videoUrl = v.value.processed
      ? getAssetUrl(v.value.processed)
      : v.value.raw
        ? getAssetUrl(v.value.raw)
        : null;
    variants.push({
      kit: v.kit,
      variantId: v.variantId,
      value: v.value,
      status,
      posterUrl,
      videoUrl,
    });
  }

  // Pause video when accordion closes
  useEffect(() => {
    if (!isVisible && videoRef.current) {
      videoRef.current.pause();
      setActiveVariant(null);
    }
  }, [isVisible]);

  if (variants.length === 0) return null;

  const activeData = activeVariant
    ? variants.find((v) => `${v.kit}-${v.variantId}` === activeVariant)
    : null;

  return (
    <div className={s.root}>
      <div className={s.strip} role="list" aria-label={`${assetType} varianten`}>
        {variants.map((v) => {
          const key = `${v.kit}-${v.variantId}`;
          const isActive = activeVariant === key;
          return (
            <button
              key={key}
              type="button"
              className={s.card}
              data-status={v.status}
              data-active={isActive || undefined}
              role="listitem"
              aria-pressed={isActive}
              aria-label={`${VARIANT_LABELS[v.variantId] ?? v.variantId} — ${STATUS_LABELS[v.status]}`}
              onClick={() => setActiveVariant(isActive ? null : key)}
            >
              <div className={s.posterWrap}>
                {v.posterUrl ? (
                  <img
                    src={v.posterUrl}
                    alt=""
                    className={s.poster}
                    loading="lazy"
                  />
                ) : (
                  <span className={s.emptyPoster} aria-hidden="true" />
                )}
                {v.videoUrl && (
                  <span className={s.playOverlay} aria-hidden="true">
                    <Play size={16} fill="currentColor" />
                  </span>
                )}
              </div>
              <span className={s.variantLabel}>
                {VARIANT_LABELS[v.variantId] ?? v.variantId}
              </span>
              <span className={s.statusBadge} data-status={v.status}>
                {STATUS_LABELS[v.status]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Inline video player */}
      {activeData?.videoUrl && (
        <div className={s.videoPanel}>
          <video
            ref={videoRef}
            key={activeVariant}
            src={activeData.videoUrl}
            controls
            preload="metadata"
            className={s.videoPlayer}
            playsInline
          >
            <track kind="captions" />
          </video>
        </div>
      )}
    </div>
  );
}
