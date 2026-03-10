/**
 * ErrorStep — Error state display
 */
import React from 'react';
import { Button, Alert } from '@django-core/design-system';
import styles from './ErrorStep.module.css';

interface ErrorStepProps {
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

export default function ErrorStep({ error, onRetry, onClose }: ErrorStepProps) {
  return (
    <div className={styles.container}>
      <div className={styles.errorIcon}>!</div>
      <h3 className={styles.errorTitle}>Generatie mislukt</h3>
      <Alert variant="error" className={styles.alertBox}>
        {error || 'Er is een onbekende fout opgetreden'}
      </Alert>
      <div className={styles.actions}>
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
