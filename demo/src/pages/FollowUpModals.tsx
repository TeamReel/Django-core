/**
 * Follow-up modals shown after approving specific asset types.
 * VideoFollowUpModal: shown after fullbody_in_tenue approval — offers intro/celebration video gen.
 * PhotoCompositeFollowUpModal: shown after photo_composite_gemini approval — offers video gen.
 */
import React, { useState } from 'react';
import { type VideoFollowUpInfo, type PhotoCompositeFollowUpInfo } from './approvalsTypes';
import { logger } from '@/utils/logger';
import { clickableProps } from '@/utils/a11y';
import s from './ApprovalsModals.module.css';
import fm from './FollowUpModals.module.css';

// ─── Video Follow-Up Modal ──────────────────────────────────────────

const INTRO_POSES = [
  { value: 'arms_crossed', label: 'Armen over elkaar', desc: 'Armen gekruist voor de borst, zelfverzekerde powerpose' },
  { value: 'hand_up', label: 'Hand omhoog', desc: 'E\u00e9n hand omhoog als begroeting' },
  { value: 'thumbs_up', label: 'Duim omhoog', desc: 'Duim omhoog naar de camera' },
] as const;

const CELEBRATION_STYLES = [
  { value: 'arms_wide', label: 'Armen wijd', desc: 'Armen wijd gespreid, juichend' },
  { value: 'fist_pump', label: 'Vuist omhoog', desc: 'Vuist de lucht in pompen' },
  { value: 'point_to_sky', label: 'Wijs naar hemel', desc: 'Wijst met \u00e9\u00e9n vinger naar de hemel' },
  { value: 'slide', label: 'Knie\u00ebn slide', desc: 'Op de knie\u00ebn glijden over het veld' },
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

  return (
    <div
      className={s.modalOverlayHigh}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div className={`${s.modalPanel} ${fm.modalPanelNarrow}`}>
        <div className={s.modalHeaderSimple}>
          <div className="flex-between">
            <div>
              <div className={s.modalTitle}>Video's genereren?</div>
              <div className={s.modalSubtitle}>
                Fullbody goedgekeurd voor <strong>{info.memberName}</strong> ({info.kitType}). Wil je ook video's genereren?
              </div>
            </div>
            <button onClick={onClose} className={s.closeBtnMuted}>✕</button>
          </div>
        </div>

        <div className={`flex-col gap-20 ${s.modalBody}`}>
          <div>
            <div className={`fs-14 fw-700 mb-8 ${s.sectionLabel}`}>Short Intro</div>
            <div className={s.sectionDescription}>Korte intro video (6 sec) — kies een pose:</div>
            <div className={`grid gap-8 ${s.grid3col}`}>
              {INTRO_POSES.map(pose => (
                <div
                  key={pose.value}
                  onClick={() => setSelectedIntro(prev => prev === pose.value ? null : pose.value)}
                  {...clickableProps(() => setSelectedIntro(prev => prev === pose.value ? null : pose.value))}
                  className={fm.chip}
                  data-selected={selectedIntro === pose.value}
                >
                  <div className={`fs-13 fw-600 ${s.chipLabel}`}>{pose.label}</div>
                  <div className={s.chipDescription}>{pose.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className={`fs-14 fw-700 mb-8 ${s.sectionLabel}`}>Goal Celebration</div>
            <div className={s.sectionDescription}>Korte viering video (6 sec) — kies een stijl:</div>
            <div className={`grid gap-8 ${s.grid2col}`}>
              {CELEBRATION_STYLES.map(style => (
                <div
                  key={style.value}
                  onClick={() => setSelectedCelebration(prev => prev === style.value ? null : style.value)}
                  {...clickableProps(() => setSelectedCelebration(prev => prev === style.value ? null : style.value))}
                  className={fm.chip}
                  data-selected={selectedCelebration === style.value}
                >
                  <div className={`fs-13 fw-600 ${s.chipLabel}`}>{style.label}</div>
                  <div className={s.chipDescription}>{style.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <div className={s.errorAlert}>{error}</div>}
        </div>

        <div className={`flex-between ${s.modalFooter}`}>
          <button onClick={onClose} className={s.btnGhost}>Overslaan</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || submitCount === 0}
            className={`${s.btnPrimary} ${fm.submitBtnDynamic}`}
            data-state={submitting ? 'submitting' : submitCount > 0 ? 'active' : 'disabled'}
          >
            {submitting ? 'Bezig...' : submitCount > 0 ? `Genereer ${submitCount} video${submitCount > 1 ? "'s" : ''}` : 'Selecteer een optie'}
          </button>
        </div>
      </div>
    </div>
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

  return (
    <div
      className={s.modalOverlayHigh}
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      role="presentation"
    >
      <div className={`${s.modalPanel} ${fm.modalPanelSmall}`}>
        <div className={s.modalHeaderSimple}>
          <div className="flex-between">
            <div>
              <div className={s.modalTitle}>
                {submitted ? 'Video in de wachtrij' : 'Video genereren?'}
              </div>
              <div className={s.modalSubtitle}>
                {submitted
                  ? `De video wordt gegenereerd en verschijnt binnenkort in de approval queue.`
                  : `Foto composite goedgekeurd voor ${info.memberName}. Wil je de geanimeerde video versie genereren?`
                }
              </div>
            </div>
            {!submitting && <button onClick={onClose} className={s.closeBtnMuted}>✕</button>}
          </div>
        </div>

        {!submitted && (
          <div className={s.previewCenter}>
            <img src={info.approvedImageUrl} alt="Approved composite" className={s.previewImg} loading="lazy" />
          </div>
        )}

        {error && <div className={`${s.errorAlert} ${fm.errorAlertInset}`}>{error}</div>}

        <div className={`${s.modalFooter} ${fm.footerDynamic}`} data-centered={submitted}>
          {submitted ? (
            <button onClick={() => { onSubmitted(); onClose(); }} className={s.btnPrimary}>Sluiten</button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={submitting}
                className={`${s.btnGhost} ${fm.skipBtnDynamic}`}
                data-disabled={submitting}
              >
                Overslaan
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`${s.btnPrimary} ${fm.submitBtnSecondary}`}
                data-submitting={submitting}
              >
                {submitting ? 'Bezig...' : 'Genereer Video'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
