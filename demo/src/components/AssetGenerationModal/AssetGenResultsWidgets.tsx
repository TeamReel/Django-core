/**
 * AssetGenResultsWidgets — step-3 (results) sub-components.
 *
 * - ResultsStep: renders submitting / polling / queued / error / completed states
 * - FeedbackRefinement: variant feedback fields for refinement
 */
import React from 'react';
import { Button } from '@django-core/design-system';
import { VariantCard, ProgressBar } from './AssetGenSubComponents';
import type { FeedbackFields } from './assetGenHelpers';
import type { UseAssetGenerationReturn, GenerationVariant } from '../../hooks/assetGenerationTypes';
import type { AssetTemplate } from '../../constants/assetTemplateTypes';
import styles from './AssetGenResultsWidgets.module.css';

// ── Results Step ─────────────────────────────────────────────────────

export function ResultsStep({
  generation,
  selectedTemplate,
  selectedVariantIdx,
  setSelectedVariantIdx,
  feedbackFields,
  setFeedbackFields,
  requireApproval,
  handleRegenerate,
}: {
  generation: UseAssetGenerationReturn;
  selectedTemplate: AssetTemplate | null;
  selectedVariantIdx: number | null;
  setSelectedVariantIdx: (idx: number) => void;
  feedbackFields: FeedbackFields;
  setFeedbackFields: React.Dispatch<React.SetStateAction<FeedbackFields>>;
  requireApproval: boolean;
  handleRegenerate: () => void;
}) {
  return (
    <div>
      {/* Submitting */}
      {generation.step === 'submitting' && (
        <div className={`text-center ${styles.centeredSection}`}>
          <div className={`mb-16 ${styles.emojiIcon}`}>
            {selectedTemplate?.outputType === 'video' ? 'V' : 'A'}
          </div>
          <div className="fs-14 fw-600 mb-8">
            {selectedTemplate?.outputType === 'video'
              ? 'Video aanmelden...'
              : 'Afbeelding aanmelden...'}
          </div>
          <ProgressBar progress={generation.progress} />
          <div className="fs-12 text-muted mt-8">
            Wordt toegevoegd aan de AI wachtrij...
          </div>
        </div>
      )}

      {/* Polling */}
      {generation.step === 'polling' && (
        <div className={`text-center ${styles.centeredSection}`}>
          <div className={`mb-16 ${styles.emojiIcon}`}></div>
          <div className="fs-14 fw-600 mb-8">Video wordt gegenereerd...</div>
          <ProgressBar progress={generation.progress} />
          <div
            className={`fs-12 text-muted mt-8 mx-auto ${styles.constrainedText}`}
          >
            Dit duurt 2–5 minuten. Je kunt dit venster open laten — het resultaat
            verschijnt automatisch.
          </div>
        </div>
      )}

      {/* Queued */}
      {generation.step === 'queued' && (
        <div className={`text-center ${styles.centeredSection}`}>
          <div className={`mb-16 ${styles.emojiIconLarge}`}>🟢</div>
          <div className="fs-16 fw-700 mb-8">
            {requireApproval ? 'In Approvals Wachtrij!' : 'Toegevoegd aan de AI Queue!'}
          </div>
          <div
            className={`fs-13 text-muted mx-auto mb-24 ${styles.constrainedText}`}
          >
            {requireApproval
              ? 'Keur de gegenereerde afbeelding goed via de Approvals pagina, daarna verschijnt deze automatisch op deze pagina.'
              : selectedTemplate?.outputType === 'video'
                ? 'De video wordt op de achtergrond gegenereerd (2–5 min). Je krijgt een melding zodra hij klaar is.'
                : 'De afbeelding wordt op de achtergrond gegenereerd. Je krijgt een melding zodra hij klaar is.'}
          </div>
          <div className={styles.queuedInfoBox}>
            <span></span>
            <span>{requireApproval ? 'Keur goed via' : 'Volg de voortgang in'}</span>
            <a
              href={requireApproval ? '/approvals' : '/approvals?tab=ai_queue'}
              className={styles.queuedLink}
            >
              {requireApproval ? 'Approvals' : 'Workflow \u2192 AI Queue'}
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {generation.step === 'error' && (
        <div
          className={`text-center ${styles.errorSection}`}
        >
          <div className={`mb-16 ${styles.emojiIcon}`}></div>
          <div className="fs-14 fw-600 mb-8">Generatie mislukt</div>
          <div className="fs-12 mb-16">{generation.error}</div>
          <Button onClick={handleRegenerate}>Opnieuw proberen</Button>
        </div>
      )}

      {/* Retrying (transient error — 503 / rate limit) */}
      {generation.step === 'polling' && generation.error && (
        <div className={`text-center ${styles.centeredSection}`}>
          <div className={`mb-16 ${styles.emojiIcon} ${styles.retryEmoji}`}>⏳</div>
          <div className="fs-14 fw-600 mb-8">AI model tijdelijk niet beschikbaar</div>
          <div
            className={`fs-12 text-muted mx-auto mb-12 ${styles.constrainedText}`}
          >
            {generation.error}
          </div>
          <div
            className={`fs-12 mx-auto ${styles.constrainedText} ${styles.retryWarning}`}
          >
            Wordt automatisch opnieuw geprobeerd… Even geduld.
          </div>
        </div>
      )}

      {/* Completed — variant grid + feedback */}
      {generation.step === 'completed' && generation.variants.length > 0 && (
        <div>
          <div className="fs-13 fw-600 mb-12">Kies de beste variant:</div>
          <div
            className={styles.variantGrid}
            data-cols={generation.variants.length === 1 ? '1' : '2'}
          >
            {generation.variants.map((v: GenerationVariant) => {
              const fullSrc =
                v.presigned_url ||
                (v.image_base64
                  ? `data:${v.mime_type || 'image/png'};base64,${v.image_base64}`
                  : null);
              return (
                <div key={v.variant_index}>
                  <VariantCard
                    variant={v}
                    selected={selectedVariantIdx === v.variant_index}
                    onClick={() => setSelectedVariantIdx(v.variant_index)}
                    isVideo={selectedTemplate?.outputType === 'video'}
                  />
                  {fullSrc && selectedTemplate?.outputType !== 'video' && (
                    <a
                      href={fullSrc}
                      target="_blank"
                      rel="noreferrer"
                      className={`block mt-4 text-center fs-11 text-decoration-none ${styles.viewFullLink}`}
                    >
                      🔍 Volledig bekijken
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feedback / Refine */}
          {selectedTemplate?.outputType !== 'video' && (
            <FeedbackRefinement
              feedbackFields={feedbackFields}
              setFeedbackFields={setFeedbackFields}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Feedback Refinement ──────────────────────────────────────────────

export function FeedbackRefinement({
  feedbackFields,
  setFeedbackFields,
}: {
  feedbackFields: FeedbackFields;
  setFeedbackFields: React.Dispatch<React.SetStateAction<FeedbackFields>>;
}) {
  const fields = [
    { id: 'colors', label: 'Kleuren (Vb: "Rood zoals V1")' },
    { id: 'pattern', label: 'Patroon (Vb: "Strepen zoals V2")' },
    { id: 'logo', label: 'Logo/Sponsor' },
    { id: 'collar', label: 'Kraag/Mouwen' },
  ];
  return (
    <div className="mt-20 border-top pt-16">
      <div className="fs-13 fw-600 mb-12">Combineer & Verbeter Varianten:</div>
      <div className="grid grid-cols-2 gap-12">
        {fields.map((field) => (
          <div key={field.id}>
            <label
              className="block fs-11 mb-4 text-muted"
            >
              {field.label}
            </label>
            <input
              type="text"
              value={feedbackFields[field.id as keyof FeedbackFields]}
              onChange={(e) =>
                setFeedbackFields((prev: FeedbackFields) => ({ ...prev, [field.id]: e.target.value }))
              }
              className={styles.feedbackInput}
            />
          </div>
        ))}
      </div>
      <div className="mt-12">
        <label
          className="block fs-11 mb-4 text-muted"
        >
          Overig / Specifiek
        </label>
        <input
          type="text"
          value={feedbackFields.other}
          onChange={(e) =>
            setFeedbackFields((prev: FeedbackFields) => ({ ...prev, other: e.target.value }))
          }
          placeholder="Bijv. 'Sokken wit', 'Meer contrast in foto'..."
          className={styles.feedbackInput}
        />
      </div>
    </div>
  );
}
