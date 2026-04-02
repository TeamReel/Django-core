/**
 * Follow-up modals shown after approving specific asset types.
 *
 * PhotoCompositeFollowUpModal: after photo_composite_gemini approval — offers video gen.
 * VideoFollowUpModal: after fullbody_in_tenue approval — offers intro/celebration video gen.
 */
import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import type { VideoFollowUpInfo, PhotoCompositeFollowUpInfo } from '@/pages/approvalsTypes';
import { logger } from '@/utils/logger';
import { clickableProps } from '@/utils/a11y';
import styles from './FollowUpModals.module.css';

// Re-export types for consumer convenience
export type { VideoFollowUpInfo, PhotoCompositeFollowUpInfo };

// ─── Video Follow-Up Modal ──────────────────────────────────────────

const INTRO_POSES = [
  { value: 'arms_crossed', label: 'Armen over elkaar', desc: 'Armen gekruist voor de borst, zelfverzekerde powerpose' },
  { value: 'hand_up', label: 'Hand omhoog', desc: 'Eén hand omhoog als begroeting' },
  { value: 'thumbs_up', label: 'Duim omhoog', desc: 'Duim omhoog naar de camera' },
] as const;

const CELEBRATION_STYLES = [
  { value: 'arms_wide', label: 'Armen wijd', desc: 'Armen wijd gespreid, juichend' },
  { value: 'fist_pump', label: 'Vuist omhoog', desc: 'Vuist de lucht in pompen' },
  { value: 'point_to_sky', label: 'Wijs naar hemel', desc: 'Wijst met één vinger naar de hemel' },
  { value: 'slide', label: 'Knieën slide', desc: 'Op de knieën glijden over het veld' },
] as const;

interface VideoFollowUpModalProps {
  info: VideoFollowUpInfo;
  onClose: () => void;
  onSubmitted: (count: number) => void;
}

export function VideoFollowUpModal({ info, onClose, onSubmitted }: VideoFollowUpModalProps) {
  const [selectedIntro, setSelectedIntro] = useState<string | null>(null);
  const [selectedCelebration, setSelectedCelebration] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCount = (selectedIntro ? 1 : 0) + (selectedCelebration ? 1 : 0);

  const handleSubmit = async () => {
    if (submitCount === 0) { onClose(); return; }
    setSubmitting(true);
    setError(null);

    const { generativeApi } = await import('../api');

    const jobs: { templateId: string; styleVariant: string; outputAssetType: string }[] = [];
    if (selectedIntro) {
      jobs.push({ templateId: 'member_intro', styleVariant: selectedIntro, outputAssetType: 'member_intro' });
    }
    if (selectedCelebration) {
      jobs.push({ templateId: 'member_goal_celebration', styleVariant: selectedCelebration, outputAssetType: 'member_goal_celebration' });
    }

    let succeeded = 0;
    for (const job of jobs) {
      try {
        const body: Record<string, unknown> = {
          template_id: job.templateId,
          parameters: { kit_type: info.kitType, style_variant: job.styleVariant },
          variant_count: 1,
          project_id: info.projectId,
          membership_id: info.membershipId,
          output_asset_type: job.outputAssetType,
          input_image_urls: { person_photo: info.approvedImageUrl },
          output_type: 'video',
          require_approval: true,
        };
        if (info.organisationId) body.organisation_id = info.organisationId;
        await generativeApi.generate(body);
        succeeded++;
      } catch (e) {
        logger.error(`Failed to submit ${job.templateId}`, e);
        setError(e instanceof Error ? e.message : 'Generatie mislukt');
      }
    }
    setSubmitting(false);
    if (succeeded > 0) onSubmitted(succeeded);
  };

  const footer = (
    <div className={styles.footerActions}>
      <button onClick={onClose} className={styles.btnGhost}>Overslaan</button>
      <button
        onClick={handleSubmit}
        disabled={submitting || submitCount === 0}
        className={styles.btnPrimary}
        data-state={submitting ? 'submitting' : submitCount > 0 ? 'active' : 'disabled'}
      >
        {submitting ? 'Bezig...' : submitCount > 0 ? `Genereer ${submitCount} video${submitCount > 1 ? "'s" : ''}` : 'Selecteer een optie'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Video's genereren?"
      subtitle={`Fullbody goedgekeurd voor ${info.memberName} (${info.kitType}). Wil je ook video's genereren?`}
      size="lg"
      footer={footer}
    >
      <div className={styles.body}>
        <div>
          <div className={styles.sectionLabel}>Short Intro</div>
          <div className={styles.sectionDescription}>Korte intro video (6 sec) — kies een pose:</div>
          <div className={styles.grid3col}>
            {INTRO_POSES.map(pose => (
              <div
                key={pose.value}
                onClick={() => setSelectedIntro(prev => prev === pose.value ? null : pose.value)}
                {...clickableProps(() => setSelectedIntro(prev => prev === pose.value ? null : pose.value))}
                className={styles.chip}
                data-selected={selectedIntro === pose.value}
              >
                <div className={styles.chipLabel}>{pose.label}</div>
                <div className={styles.chipDescription}>{pose.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel}>Goal Celebration</div>
          <div className={styles.sectionDescription}>Korte viering video (6 sec) — kies een stijl:</div>
          <div className={styles.grid2col}>
            {CELEBRATION_STYLES.map(style => (
              <div
                key={style.value}
                onClick={() => setSelectedCelebration(prev => prev === style.value ? null : style.value)}
                {...clickableProps(() => setSelectedCelebration(prev => prev === style.value ? null : style.value))}
                className={styles.chip}
                data-selected={selectedCelebration === style.value}
              >
                <div className={styles.chipLabel}>{style.label}</div>
                <div className={styles.chipDescription}>{style.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}
      </div>
    </Modal>
  );
}

// ─── Photo Composite Follow-Up Modal ──────────────────────────────

interface PhotoCompositeFollowUpModalProps {
  info: PhotoCompositeFollowUpInfo;
  onClose: () => void;
  onSubmitted: () => void;
}

export function PhotoCompositeFollowUpModal({ info, onClose, onSubmitted }: PhotoCompositeFollowUpModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const { generativeApi } = await import('../api');

      const body: Record<string, unknown> = {
        template_id: 'photo_composite_video',
        parameters: {},
        variant_count: 1,
        project_id: info.projectId,
        membership_id: info.membershipId,
        output_asset_type: 'photo_composite_video',
        input_image_urls: { person_photo: info.approvedImageUrl },
        output_type: 'video',
        require_approval: true,
      };
      if (info.backgroundUrl) {
        body.input_image_urls = { person_photo: info.approvedImageUrl, background: info.backgroundUrl };
      }

      await generativeApi.generate(body);
      setSubmitted(true);
    } catch (e) {
      logger.error('Failed to submit photo_composite_video', e);
      setError(e instanceof Error ? e.message : 'Generatie mislukt');
      setSubmitting(false);
    }
  };

  const footer = submitted ? (
    <button onClick={() => { onSubmitted(); onClose(); }} className={styles.btnPrimary}>
      Sluiten
    </button>
  ) : (
    <div className={styles.footerActions}>
      <button onClick={onClose} disabled={submitting} className={styles.btnGhost}>
        Overslaan
      </button>
      <button onClick={handleSubmit} disabled={submitting} className={styles.btnPrimary}>
        {submitting ? 'Bezig...' : 'Genereer Video'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={submitted ? 'Video in de wachtrij' : 'Video genereren?'}
      subtitle={submitted
        ? 'De video wordt gegenereerd en verschijnt binnenkort in de approval queue.'
        : `Foto composite goedgekeurd voor ${info.memberName}. Wil je de geanimeerde video versie genereren?`
      }
      preventClose={submitting}
      footer={footer}
    >
      {!submitted && (
        <div className={styles.previewCenter}>
          <img src={info.approvedImageUrl} alt="Approved composite" className={styles.previewImg} loading="lazy" />
        </div>
      )}
      {error && <div className={styles.errorAlert}>{error}</div>}
    </Modal>
  );
}
