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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: '48px', paddingBottom: '48px', textAlign: 'center' }}>
      <div style={{ fontSize: '60px', marginBottom: '16px' }}>!</div>
      <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--app-error, #E63946)' }}>Generatie mislukt</h3>
      <Alert variant="error" style={{ maxWidth: '448px', marginBottom: '24px' }}>
        {error || 'Er is een onbekende fout opgetreden'}
      </Alert>
      <div style={{ display: 'flex', gap: '12px' }}>
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
