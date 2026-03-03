/**
 * Follow-up modals shown after approving specific asset types.
 * VideoFollowUpModal: shown after fullbody_in_tenue approval — offers intro/celebration video gen.
 * PhotoCompositeFollowUpModal: shown after photo_composite_gemini approval — offers video gen.
 */
import React, { useState } from 'react';
import { type VideoFollowUpInfo, type PhotoCompositeFollowUpInfo } from './approvalsTypes';
import s from './ApprovalsPage.module.css';

// ─── Video Follow-Up Modal ──────────────────────────────────────────

const INTRO_POSES = [
  { value: 'arms_crossed', label: '🙅 Armen over elkaar', desc: 'Armen gekruist voor de borst, zelfverzekerde powerpose' },
  { value: 'hand_up', label: '✋ Hand omhoog', desc: 'Eén hand omhoog als begroeting' },
  { value: 'thumbs_up', label: '👍 Duim omhoog', desc: 'Duim omhoog naar de camera' },
] as const;

const CELEBRATION_STYLES = [
  { value: 'arms_wide', label: '🙌 Armen wijd', desc: 'Armen wijd gespreid, juichend' },
  { value: 'fist_pump', label: '✊ Vuist omhoog', desc: 'Vuist de lucht in pompen' },
  { value: 'point_to_sky', label: '☝️ Wijs naar hemel', desc: 'Wijst met één vinger naar de hemel' },
  { value: 'slide', label: '🛝 Knieën slide', desc: 'Op de knieën glijden over het veld' },
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

    const { getApiBaseUrl } = await import('../utils/apiBase');
    const apiBase = getApiBaseUrl();
    const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';

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
        const res = await fetch(`${apiBase}/api/v1/generative/assets/generate/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.data?.error || err?.error || `HTTP ${res.status}`);
        }
        succeeded++;
      } catch (e) {
        console.error(`Failed to submit ${job.templateId}:`, e);
        setError(e instanceof Error ? e.message : 'Generatie mislukt');
      }
    }
    setSubmitting(false);
    if (succeeded > 0) onSubmitted(succeeded);
  };

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
    border: `2px solid ${selected ? 'var(--color-blue-600)' : 'var(--app-border, #e5e7eb)'}`,
    backgroundColor: selected ? '#eff6ff' : 'var(--app-surface, #fff)',
    transition: 'all 0.15s',
  });

  return (
    <div
      className={s.modalOverlayHigh}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={s.modalPanel} style={{ maxWidth: 560 }}>
        <div className={s.modalHeaderSimple}>
          <div className="flex-between">
            <div>
              <div className={s.modalTitle}>🎬 Video's genereren?</div>
              <div className={s.modalSubtitle}>
                Fullbody goedgekeurd voor <strong>{info.memberName}</strong> ({info.kitType}). Wil je ook video's genereren?
              </div>
            </div>
            <button onClick={onClose} className={s.closeBtnMuted}>✕</button>
          </div>
        </div>

        <div className={`flex-col gap-20 ${s.modalBody}`}>
          <div>
            <div className={`fs-14 fw-700 mb-8 ${s.sectionLabel}`}>🎬 Short Intro</div>
            <div className={s.sectionDescription}>Korte intro video (6 sec) — kies een pose:</div>
            <div className={`grid gap-8 ${s.grid3col}`}>
              {INTRO_POSES.map(pose => (
                <div
                  key={pose.value}
                  onClick={() => setSelectedIntro(prev => prev === pose.value ? null : pose.value)}
                  style={chipStyle(selectedIntro === pose.value)}
                >
                  <div className={`fs-13 fw-600 ${s.chipLabel}`}>{pose.label}</div>
                  <div className={s.chipDescription}>{pose.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className={`fs-14 fw-700 mb-8 ${s.sectionLabel}`}>⚽ Goal Celebration</div>
            <div className={s.sectionDescription}>Korte viering video (6 sec) — kies een stijl:</div>
            <div className={`grid gap-8 ${s.grid2col}`}>
              {CELEBRATION_STYLES.map(style => (
                <div
                  key={style.value}
                  onClick={() => setSelectedCelebration(prev => prev === style.value ? null : style.value)}
                  style={chipStyle(selectedCelebration === style.value)}
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
            className={s.btnPrimary}
            style={{
              cursor: submitting ? 'wait' : submitCount > 0 ? 'pointer' : 'not-allowed',
              opacity: submitting ? 0.7 : 1,
              background: submitCount > 0 ? 'var(--color-blue-600)' : '#94a3b8',
            }}
          >
            {submitting ? 'Bezig...' : submitCount > 0 ? `🚀 Genereer ${submitCount} video${submitCount > 1 ? "'s" : ''}` : 'Selecteer een optie'}
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
      const { getApiBaseUrl } = await import('../utils/apiBase');
      const apiBase = getApiBaseUrl();
      const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';

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

      const res = await fetch(`${apiBase}/api/v1/generative/assets/generate/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.data?.error || err?.error || `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (e) {
      console.error('Failed to submit photo_composite_video:', e);
      setError(e instanceof Error ? e.message : 'Generatie mislukt');
      setSubmitting(false);
    }
  };

  return (
    <div
      className={s.modalOverlayHigh}
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className={s.modalPanel} style={{ maxWidth: 480 }}>
        <div className={s.modalHeaderSimple}>
          <div className="flex-between">
            <div>
              <div className={s.modalTitle}>
                {submitted ? '✅ Video in de wachtrij!' : '🎬 Video genereren?'}
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
            <img src={info.approvedImageUrl} alt="Approved composite" className={s.previewImg} />
          </div>
        )}

        {error && <div className={s.errorAlert} style={{ margin: '0 24px 16px' }}>{error}</div>}

        <div className={s.modalFooter} style={{ justifyContent: submitted ? 'center' : 'space-between' }}>
          {submitted ? (
            <button onClick={() => { onSubmitted(); onClose(); }} className={s.btnPrimary}>Sluiten</button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={submitting}
                className={s.btnGhost}
                style={{ cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.5 : 1 }}
              >
                Overslaan
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={s.btnPrimary}
                style={{ cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Bezig...' : '🚀 Genereer Video'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
