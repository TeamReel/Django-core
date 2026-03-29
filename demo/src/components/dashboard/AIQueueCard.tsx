import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './DashboardSummaries.module.css';

export const AIQueueCard: React.FC = () => {
  const queueCounts = useQueueCounts();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeJobs = queueCounts?.active || 0;
  const reviewJobs = queueCounts?.review || 0;
  const completedJobs = queueCounts?.completed || 0;
  const rejectedJobs = queueCounts?.rejected || 0;
  const aiJobs = queueCounts?.ai_queue || 0;
  const videoJobs = queueCounts?.video || 0;
  const allJobs = queueCounts?.all || 0;
  const hasWork = activeJobs > 0 || reviewJobs > 0;

  return (
    <>
    <div
      className={styles.summaryCard}
      onClick={() => setSheetOpen(true)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSheetOpen(true); } }}
      role="button"
      tabIndex={0}
    >
      <div className={`${styles.cardIcon} ${hasWork ? styles.iconAmber : styles.iconGreen}`}>
        <Cpu size={18} />
      </div>
      <div className={styles.cardContent}>
        {hasWork ? (
          <>
            <div className={styles.cardValue}>
              {activeJobs > 0 && <span>{activeJobs} actief</span>}
              {reviewJobs > 0 && <span className={styles.reviewBadge}>{reviewJobs} review</span>}
            </div>
            <div className={styles.cardLabel}>AI Queue</div>
          </>
        ) : (
          <>
            <div className={styles.cardValue}>
              <CheckCircle2 size={14} /> Idle
            </div>
            <div className={styles.cardLabel}>AI Queue</div>
          </>
        )}
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </div>

    <NavigationSheet
      isOpen={sheetOpen}
      onClose={() => setSheetOpen(false)}
      title="AI Queue"
      icon={<Cpu size={18} />}
    >
      <div className={styles.queueSheetContent}>
        <div className={styles.queueStatsGrid}>
          <div className={styles.queueStatCell}>
            <div className={`${styles.queueStatValue} ${activeJobs > 0 ? styles.queueStatValueActive : ''}`}>{activeJobs}</div>
            <div className={styles.queueStatLabel}>Actief</div>
          </div>
          <div className={styles.queueStatCell}>
            <div className={`${styles.queueStatValue} ${reviewJobs > 0 ? styles.queueStatValueReview : ''}`}>{reviewJobs}</div>
            <div className={styles.queueStatLabel}>Te reviewen</div>
          </div>
          <div className={styles.queueStatCell}>
            <div className={`${styles.queueStatValue} ${styles.queueStatValueGreen}`}>{completedJobs}</div>
            <div className={styles.queueStatLabel}>Voltooid</div>
          </div>
          <div className={styles.queueStatCell}>
            <div className={`${styles.queueStatValue} ${rejectedJobs > 0 ? styles.queueStatValueRed : ''}`}>{rejectedJobs}</div>
            <div className={styles.queueStatLabel}>Afgewezen</div>
          </div>
        </div>

        <div className={styles.queuePipeline}>
          <div className={styles.queuePipelineTitle}>Pipeline</div>
          <div className={styles.queuePipelineRow}>
            <span className={styles.queuePipelineLabel}>AI generatie</span>
            <span className={styles.queuePipelineValue}>{aiJobs}</span>
          </div>
          <div className={styles.queuePipelineRow}>
            <span className={styles.queuePipelineLabel}>Video processing</span>
            <span className={styles.queuePipelineValue}>{videoJobs}</span>
          </div>
          <div className={styles.queuePipelineTotal}>
            <span className={styles.queuePipelineTotalLabel}>Totaal</span>
            <span className={styles.queuePipelineTotalValue}>{allJobs}</span>
          </div>
        </div>

        <button
          onClick={() => { setSheetOpen(false); navigate('/content'); }}
          className={styles.sheetNavLink}
        >
          Bekijk alle content <ChevronRight size={14} />
        </button>
      </div>
    </NavigationSheet>
    </>
  );
};
