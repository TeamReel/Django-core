/**
 * ContentPipelineCard — Visual pipeline status for content processing.
 *
 * Shows a horizontal step indicator: In wacht → In productie → Klaar voor review → Gepubliceerd.
 * Each step is clickable → navigates to the corresponding Approvals tab.
 * Pulse animation on "Klaar voor review" when items are waiting.
 *
 * Uses useQueueCounts (shared singleton, no extra API calls).
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Cpu, CheckCircle2, Send, ChevronRight,
} from 'lucide-react';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import styles from './ContentPipelineCard.module.css';

interface PipelineStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  /** Approvals tab to navigate to */
  tab: string;
  /** Whether this step should pulse when count > 0 */
  pulse?: boolean;
}

export const ContentPipelineCard: React.FC = () => {
  const counts = useQueueCounts();
  const navigate = useNavigate();

  const steps: PipelineStep[] = [
    {
      key: 'active',
      label: 'In productie',
      icon: <Cpu size={16} />,
      count: counts?.active || 0,
      tab: 'active',
    },
    {
      key: 'review',
      label: 'Te reviewen',
      icon: <CheckCircle2 size={16} />,
      count: counts?.review || 0,
      tab: 'review',
      pulse: true,
    },
    {
      key: 'completed',
      label: 'Goedgekeurd',
      icon: <Send size={16} />,
      count: counts?.completed || 0,
      tab: 'completed',
    },
  ];

  const totalActive = (counts?.active || 0) + (counts?.review || 0);

  const handleStepClick = useCallback((tab: string) => {
    navigate(`/content?tab=${tab}`);
  }, [navigate]);

  // Don't render if there's zero content activity
  if (!counts || (totalActive === 0 && (counts?.completed || 0) === 0)) {
    return null;
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Clock size={14} className={styles.headerIcon} />
        <span className={styles.title}>Content pipeline</span>
        <button
          className={styles.seeAll}
          onClick={() => navigate('/content')}
        >
          Alles <ChevronRight size={12} />
        </button>
      </div>

      <div className={styles.pipeline}>
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            {i > 0 && <div className={styles.connector} />}
            <button
              className={`${styles.step} ${step.count > 0 ? styles.stepActive : ''} ${step.pulse && step.count > 0 ? styles.stepPulse : ''}`}
              onClick={() => handleStepClick(step.tab)}
              aria-label={`${step.label}: ${step.count} items`}
            >
              <div className={styles.stepIcon}>
                {step.icon}
              </div>
              <span className={styles.stepCount}>{step.count}</span>
              <span className={styles.stepLabel}>{step.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
