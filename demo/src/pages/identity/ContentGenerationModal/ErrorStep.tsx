/**
 * ErrorStep — Error state display
 */
import React from 'react';
import { Button, Alert } from '@django-core/design-system';

interface ErrorStepProps {
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

export default function ErrorStep({ error, onRetry, onClose }: ErrorStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)', textAlign: 'center' }}>
      <div style={{ fontSize: '60px', marginBottom: 'var(--space-4)' }}>!</div>
      <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)', color: 'var(--app-error, #E63946)' }}>Generatie mislukt</h3>
      <Alert variant="error" style={{ maxWidth: '448px', marginBottom: 'var(--space-6)' }}>
        {error || 'Er is een onbekende fout opgetreden'}
      </Alert>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button variant="secondary" onClick={onRetry}>
          Opnieuw proberen
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Sluiten
        </Button>
      </div>
    </div>
  );
}
