/**
 * AccordionActionBar — Action buttons inside an expanded accordion panel.
 *
 * Shows contextual actions: generate, upload, reprocess.
 * Only visible for admin users (when onEdit is provided).
 */
import React, { useRef, useCallback } from 'react';
import { Wand2, Upload, RotateCw } from 'lucide-react';
import { iterVariants, ROLE_KIT_MAP, IMAGE_ASSET_TYPES, type TeamreelAssets } from '../../utils/assetMetadata';
import s from './AccordionActionBar.module.css';

interface AccordionActionBarProps {
  assets: TeamreelAssets | undefined;
  role: string;
  assetType: string;
  /** Called to open the generation modal/editor for this asset type */
  onGenerate?: () => void;
  /** Called after a file is selected for upload */
  onUpload?: (file: File) => void;
  /** Called to reprocess existing raw assets */
  onReprocess?: () => void;
}

export function AccordionActionBar({
  assets,
  role,
  assetType,
  onGenerate,
  onUpload,
  onReprocess,
}: AccordionActionBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isImage = IMAGE_ASSET_TYPES.has(assetType);
  const mediaType = isImage ? 'images' : 'videos';
  const accept = isImage ? 'image/*' : 'video/*';

  // Check if raw exists without processed (reprocess-worthy)
  const hasRawWithoutProcessed = (() => {
    const allowedKits = ROLE_KIT_MAP[role]?.kits ?? [];
    const kitsToSearch = allowedKits.length > 0 ? allowedKits : [undefined as string | undefined];
    for (const kit of kitsToSearch) {
      const variants = iterVariants(assets, role, mediaType, assetType, kit);
      for (const v of variants) {
        if (v.value?.raw && !v.value?.processed) return true;
      }
    }
    return false;
  })();

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUpload) onUpload(file);
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [onUpload],
  );

  // Don't render if no actions available
  if (!onGenerate && !onUpload && !onReprocess) return null;

  return (
    <div className={s.actionBar}>
      {onGenerate && (
        <button type="button" className={s.actionButton} onClick={onGenerate}>
          <Wand2 size={14} aria-hidden="true" />
          <span>Genereer</span>
        </button>
      )}
      {onUpload && (
        <>
          <button
            type="button"
            className={s.actionButton}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} aria-hidden="true" />
            <span>Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className={s.hiddenInput}
            onChange={handleFileChange}
            tabIndex={-1}
            aria-hidden="true"
          />
        </>
      )}
      {onReprocess && hasRawWithoutProcessed && (
        <button type="button" className={s.actionButton} onClick={onReprocess}>
          <RotateCw size={14} aria-hidden="true" />
          <span>Reprocess</span>
        </button>
      )}
    </div>
  );
}
