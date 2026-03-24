/**
 * KitCardStrip — Horizontal scroll of kit thumbnail cards for image asset types.
 *
 * Shows one KitCard per allowed kit (e.g. home, away, goalkeeper).
 * Empty kits show a dashed placeholder. Filtered by ROLE_KIT_MAP.
 */
import React, { useCallback } from 'react';
import { iterVariants, ROLE_KIT_MAP, type TeamreelAssets, type VariantValue } from '../../utils/assetMetadata';
import { getAssetUrl } from '../../hooks/brandProfileConstants';
import s from './KitCardStrip.module.css';

/* ── Kit labels ── */
const KIT_LABELS: Record<string, string> = {
  home: 'Thuis',
  away: 'Uit',
  third: 'Third',
  goalkeeper: 'Keeper',
  legacy: 'Legacy',
};

/* ── Status helpers ── */
type KitStatus = 'processed' | 'raw' | 'processing' | 'empty';

function deriveStatus(v: VariantValue | undefined): KitStatus {
  if (!v) return 'empty';
  if (v.processing_state === 'processing') return 'processing';
  if (v.processed) return 'processed';
  if (v.raw) return 'raw';
  return 'empty';
}

const STATUS_LABELS: Record<KitStatus, string> = {
  processed: 'Klaar',
  raw: 'Ruwe upload',
  processing: 'Bezig...',
  empty: 'Geen',
};

/* ── Props ── */
interface KitCardStripProps {
  assets: TeamreelAssets | undefined;
  role: string;
  assetType: string;
}

export function KitCardStrip({ assets, role, assetType }: KitCardStripProps) {
  const allowedKits = ROLE_KIT_MAP[role]?.kits ?? [];

  /** Hide broken images — show placeholder instead of alt text. */
  const handleImgError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const placeholder = e.currentTarget.nextElementSibling as HTMLElement | null;
    if (placeholder) placeholder.style.display = '';
  }, []);

  if (allowedKits.length === 0) return null;

  // Collect data per kit
  const kitData = allowedKits.map((kit) => {
    const variants = iterVariants(assets, role, 'images', assetType, kit);
    // Take first variant for thumbnail
    const first = variants[0]?.value;
    const status = deriveStatus(first);
    const thumbUrl = first?.processed ?? first?.raw;
    return { kit, status, thumbUrl: thumbUrl ? getAssetUrl(thumbUrl) : null };
  });

  return (
    <div className={s.strip} role="list" aria-label={`${assetType} per kit`}>
      {kitData.map(({ kit, status, thumbUrl }) => (
        <div key={kit} className={s.card} role="listitem" data-status={status}>
          <div className={s.thumbWrap}>
            {thumbUrl ? (
              <>
                <img
                  src={thumbUrl}
                  alt={`${KIT_LABELS[kit] ?? kit} ${assetType}`}
                  className={s.thumb}
                  loading="lazy"
                  onError={handleImgError}
                />
                <span className={s.emptyIcon} aria-hidden="true" style={{ display: 'none' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1" y="1" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                  </svg>
                </span>
              </>
            ) : (
              <span className={s.emptyIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="1" y="1" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
              </span>
            )}
          </div>
          <span className={s.kitLabel}>{KIT_LABELS[kit] ?? kit}</span>
          <span className={s.statusBadge} data-status={status}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      ))}
    </div>
  );
}
