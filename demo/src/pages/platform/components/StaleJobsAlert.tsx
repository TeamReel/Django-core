import React from 'react';
import { Alert } from '@django-core/design-system';
import type { StaleJob } from '../platformStatsTypes';
import styles from '../PlatformStatsPage.module.css';

interface StaleJobsAlertProps {
  jobs?: StaleJob[];
}

export const StaleJobsAlert: React.FC<StaleJobsAlertProps> = ({ jobs }) => {
  if (!jobs || jobs.length === 0) return null;

  return (
    <Alert variant="error" className={styles.staleAlert}>
      <strong>{jobs.length} vastgelopen video job{jobs.length > 1 ? 's' : ''}</strong>
      <ul className={styles.staleList}>
        {jobs.map((job) => (
          <li key={job.id}>
            #{job.id} — {job.type} — al {job.minutes_elapsed} minuten bezig
          </li>
        ))}
      </ul>
    </Alert>
  );
};
