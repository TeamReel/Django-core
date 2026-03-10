/**
 * StudioSection — One content-type section with horizontal scroll
 */
import React, { useRef } from 'react';
import { Badge } from '@django-core/design-system';
import { ChevronRight } from 'lucide-react';
import type { ContentGroup } from './useStudioData';
import type { ContentItem } from '../content/contentLibraryTypes';
import { StudioContentCard, type ViewMode } from './StudioCards';
import styles from './AIStudioPage.module.css';

export interface StudioSectionProps {
  group: ContentGroup;
  onPreview: (item: ContentItem) => void;
  onViewAll: (group: ContentGroup) => void;
  viewMode?: ViewMode;
}

export function StudioSection({
  group,
  onPreview,
  onViewAll,
  viewMode = 'type',
}: StudioSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleRow}>
          <span className={styles.sectionIcon}>{group.icon}</span>
          <h3 className={styles.sectionTitle}>{group.label}</h3>
          <Badge size="sm" variant="default">{group.items.length}</Badge>
        </div>
        {group.items.length > 3 && (
          <button className={styles.sectionViewAll} onClick={() => onViewAll(group)} type="button">
            Bekijk alles <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className={styles.sectionScroll} ref={scrollRef}>
        {group.items.slice(0, 20).map((item) => (
          <StudioContentCard key={item.id} item={item} onPreview={onPreview} viewMode={viewMode} />
        ))}
      </div>
    </section>
  );
}
