/**
 * AssetGenResultsWidgets — step-3 (results) sub-components.
 *
 * - ResultsStep: renders submitting / polling / queued / error / completed states
 * - FeedbackRefinement: variant feedback fields for refinement
 */
import React from 'react';
import { Button } from '@django-core/design-system';
import { VariantCard, ProgressBar } from './AssetGenSubComponents';

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
  generation: any;
  selectedTemplate: any;
  selectedVariantIdx: number | null;
  setSelectedVariantIdx: (idx: number) => void;
  feedbackFields: any;
  setFeedbackFields: any;
  requireApproval: boolean;
  handleRegenerate: () => void;
}) {
  return (
    <div>
      {/* Submitting */}
      {generation.step === 'submitting' && (
        <div className="text-center" style={{ padding: '40px 0' }}>
          <div className="mb-16" style={{ fontSize: 48 }}>
            {selectedTemplate?.outputType === 'video' ? '🎬' : '🎨'}
          </div>
          <div className="fs-14 fw-600 mb-8">
            {selectedTemplate?.outputType === 'video'
              ? 'Video aanmelden...'
              : 'Afbeelding aanmelden...'}
          </div>
          <ProgressBar progress={generation.progress} />
          <div
            style={{
              fontSize: 12,
              color: 'var(--vscode-descriptionForeground, #888)',
              marginTop: 8,
            }}
          >
            Wordt toegevoegd aan de AI wachtrij...
          </div>
        </div>
      )}

      {/* Polling */}
      {generation.step === 'polling' && (
        <div className="text-center" style={{ padding: '40px 0' }}>
          <div className="mb-16" style={{ fontSize: 48 }}>🎬</div>
          <div className="fs-14 fw-600 mb-8">Video wordt gegenereerd...</div>
          <ProgressBar progress={generation.progress} />
          <div
            style={{
              fontSize: 12,
              color: 'var(--vscode-descriptionForeground, #888)',
              marginTop: 8,
              maxWidth: 320,
              margin: '8px auto 0',
            }}
          >
            Dit duurt 2–5 minuten. Je kunt dit venster open laten — het resultaat
            verschijnt automatisch.
          </div>
        </div>
      )}

      {/* Queued */}
      {generation.step === 'queued' && (
        <div className="text-center" style={{ padding: '40px 0' }}>
          <div className="mb-16" style={{ fontSize: 64 }}>🟢</div>
          <div className="fs-16 fw-700 mb-8">
            {requireApproval ? 'In Approvals Wachtrij!' : 'Toegevoegd aan de AI Queue!'}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--vscode-descriptionForeground, #888)',
              marginBottom: 24,
              maxWidth: 320,
              margin: '0 auto 24px',
            }}
          >
            {requireApproval
              ? 'Keur de gegenereerde afbeelding goed via de Approvals pagina, daarna verschijnt deze automatisch op deze pagina.'
              : selectedTemplate?.outputType === 'video'
                ? 'De video wordt op de achtergrond gegenereerd (2–5 min). Je krijgt een melding zodra hij klaar is.'
                : 'De afbeelding wordt op de achtergrond gegenereerd. Je krijgt een melding zodra hij klaar is.'}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'var(--vscode-editorWidget-background, #252526)',
              border: '1px solid var(--vscode-widget-border, #333)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--vscode-descriptionForeground, #888)',
            }}
          >
            <span>📥</span>
            <span>{requireApproval ? 'Keur goed via' : 'Volg de voortgang in'}</span>
            <a
              href={requireApproval ? '/approvals' : '/approvals?tab=ai_queue'}
              style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}
            >
              {requireApproval ? 'Approvals' : 'Workflow \u2192 AI Queue'}
            </a>
          </div>
        </div>
      )}

      {/* Error */}
      {generation.step === 'error' && (
        <div
          className="text-center"
          style={{ padding: '40px 0', color: 'var(--vscode-errorForeground, #f44)' }}
        >
          <div className="mb-16" style={{ fontSize: 48 }}>❌</div>
          <div className="fs-14 fw-600 mb-8">Generatie mislukt</div>
          <div className="fs-12 mb-16">{generation.error}</div>
          <Button onClick={handleRegenerate}>Opnieuw proberen</Button>
        </div>
      )}

      {/* Completed — variant grid + feedback */}
      {generation.step === 'completed' && generation.variants.length > 0 && (
        <div>
          <div className="fs-13 fw-600 mb-12">Kies de beste variant:</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                generation.variants.length === 1
                  ? '1fr'
                  : `repeat(${Math.min(generation.variants.length, 2)}, 1fr)`,
              gap: 12,
              alignItems: 'start',
            }}
          >
            {generation.variants.map((v: any) => {
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
                      style={{
                        display: 'block',
                        marginTop: 4,
                        textAlign: 'center',
                        fontSize: 11,
                        color: 'var(--vscode-textLink-foreground, #60a5fa)',
                        textDecoration: 'none',
                        opacity: 0.8,
                      }}
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
  feedbackFields: any;
  setFeedbackFields: any;
}) {
  const fields = [
    { id: 'colors', label: 'Kleuren (Vb: "Rood zoals V1")' },
    { id: 'pattern', label: 'Patroon (Vb: "Strepen zoals V2")' },
    { id: 'logo', label: 'Logo/Sponsor' },
    { id: 'collar', label: 'Kraag/Mouwen' },
  ];
  return (
    <div
      style={{
        marginTop: 20,
        borderTop: '1px solid var(--vscode-widget-border, #333)',
        paddingTop: 16,
      }}
    >
      <div className="fs-13 fw-600 mb-12">Combineer & Verbeter Varianten:</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {fields.map((field) => (
          <div key={field.id}>
            <label
              className="block fs-11 mb-4"
              style={{ color: 'var(--vscode-descriptionForeground, #888)' }}
            >
              {field.label}
            </label>
            <input
              type="text"
              value={feedbackFields[field.id]}
              onChange={(e) =>
                setFeedbackFields((prev: any) => ({ ...prev, [field.id]: e.target.value }))
              }
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 12,
                background: 'var(--vscode-input-background, #3c3c3c)',
                color: 'var(--vscode-input-foreground, #ccc)',
                border: '1px solid var(--vscode-input-border, #3c3c3c)',
                borderRadius: 4,
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-12">
        <label
          className="block fs-11 mb-4"
          style={{ color: 'var(--vscode-descriptionForeground, #888)' }}
        >
          Overig / Specifiek
        </label>
        <input
          type="text"
          value={feedbackFields.other}
          onChange={(e) =>
            setFeedbackFields((prev: any) => ({ ...prev, other: e.target.value }))
          }
          placeholder="Bijv. 'Sokken wit', 'Meer contrast in foto'..."
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: 12,
            background: 'var(--vscode-input-background, #3c3c3c)',
            color: 'var(--vscode-input-foreground, #ccc)',
            border: '1px solid var(--vscode-input-border, #3c3c3c)',
            borderRadius: 4,
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
