import { useState } from 'react';
import { api } from '@/api';
import s from './TopNavbar.module.css';
import styles from './NavbarModals.module.css';
import type { PhotoCompositeFollowUpInfo } from './topNavbarHelpers';

export interface NavbarPhotoCompositeFollowUpModalProps {
  info: PhotoCompositeFollowUpInfo;
  onClose: () => void;
  onSubmitted: () => void;
}

export function NavbarPhotoCompositeFollowUpModal({ info, onClose, onSubmitted }: NavbarPhotoCompositeFollowUpModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitVideo = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/generative/assets/generate/', {
        template_id: 'photo_composite_video',
        parameters: {},
        variant_count: 1,
        project_id: info.projectId,
        membership_id: info.membershipId,
        output_asset_type: 'photo_composite_video',
        input_image_urls: { person_photo: info.approvedImageUrl },
        output_type: 'video',
        require_approval: true,
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      console.error('Failed to submit photo_composite_video:', e);
      setError(e instanceof Error ? e.message : 'Generatie mislukt');
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      className={s.modalOverlayHigh}
    >
      <div className={s.followUpPanel}>
        {/* Header */}
        <div className={s.followUpHeader}>
          <div className="flex-between">
            <div>
              <div className={s.followUpTitle}>
                {submitted ? '\u2705 Video in de wachtrij!' : '\ud83c\udfac Video genereren?'}
              </div>
              <div className={s.followUpSubtitle}>
                {submitted
                  ? 'De video wordt gegenereerd en verschijnt binnenkort in de approval queue.'
                  : `Foto composite goedgekeurd voor ${info.memberName}. Wil je de geanimeerde video versie genereren?`
                }
              </div>
            </div>
            {!submitting && <button onClick={onClose} className={s.closeBtnMuted}>{'\u2715'}</button>}
          </div>
        </div>

        {/* Preview */}
        {!submitted && (
          <div className={s.followUpPreview}>
            <img
              src={info.approvedImageUrl}
              alt="Approved composite"
              className={s.followUpImg}
            />
          </div>
        )}

        {error && (
          <div className={s.followUpError}>{error}</div>
        )}

        {/* Footer */}
          <div className={`${s.followUpFooter} ${styles.followUpFooter}`} data-submitted={submitted}>
          {submitted ? (
            <button
              onClick={() => { onSubmitted(); onClose(); }}
              className={s.btnPrimary}
            >
              Sluiten
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={submitting}
                className={`${s.followUpSkipBtn} ${styles.followUpSkipBtn}`}
                data-submitting={submitting}
              >
                Overslaan
              </button>
              <button
                onClick={handleSubmitVideo}
                disabled={submitting}
                className={`${s.followUpSubmitBtn} ${styles.followUpSubmitBtn}`}
                data-submitting={submitting}
              >
                {submitting ? 'Bezig...' : '\ud83d\ude80 Genereer Video'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
