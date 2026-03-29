/**
 * ContentProgressCard — Merged ContentBreakdownCard + ContentOverviewCard.
 *
 * Card preview: compact category bars (Spelers/Wedstrijd/Seizoen) + total badge.
 * Sheet: Tabs (design system) with "Overzicht" (bars) and "Inventaris" (full inventory).
 *
 * Data logic extracted to useContentProgress hook.
 * Types/helpers in contentProgressUtils.ts.
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, ChevronRight, Image, Film, FileText, Sparkles, Trophy,
} from 'lucide-react';
import { Tabs, TabList, Tab, TabPanel } from '@django-core/design-system';
import { NavigationSheet } from '../ui/NavigationSheet';
import { useContentProgress } from './useContentProgress';
import { SUBTYPE_LABELS } from './contentProgressUtils';
import type { SectionData } from './contentProgressUtils';
import styles from './ContentProgressCard.module.css';

/* ── Component ─────────────────────────────── */

export const ContentProgressCard: React.FC = () => {
  const navigate = useNavigate();
  const { loading, categories, sections, maxCount, totalCount, grandTotal } = useContentProgress();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['match']));

  const toggleSection = useCallback((key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (!loading && categories.length === 0 && sections.length === 0) return null;

  /* ── Render helpers ──────────────────────── */

  const renderSectionBody = (sec: SectionData) => (
    <>
      {sec.matches && (
        <div>
          {sec.matches.map(mg => (
            <div key={mg.matchId} className={styles.matchGroup}>
              <div className={styles.matchLabel}>
                <Trophy size={12} />
                <span>{mg.title}</span>
                {mg.date && (
                  <span className={styles.matchDate}>
                    {new Date(mg.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
              <div className={styles.typeChips}>
                {mg.items.map(item => (
                  <span key={item.subtype} className={styles.typeChip} data-type={item.outputType}>
                    {item.outputType === 'video' ? <Film size={10} /> : item.outputType === 'text' ? <FileText size={10} /> : <Image size={10} />}
                    {SUBTYPE_LABELS[item.subtype] || item.subtype}
                    {item.count > 1 && ` ×${item.count}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {sec.items && (
        <div className={`${styles.typeChips} ${styles.paddingTopSmall}`}>
          {sec.items.map(item => (
            <span key={item.subtype} className={styles.typeChip} data-type={item.outputType}>
              {item.outputType === 'video' ? <Film size={10} /> : item.outputType === 'text' ? <FileText size={10} /> : <Image size={10} />}
              {SUBTYPE_LABELS[item.subtype] || item.subtype}
              {item.count > 1 && ` ×${item.count}`}
            </span>
          ))}
        </div>
      )}
    </>
  );

  const renderBars = () => (
    <div className={styles.barList}>
      {categories.map(cat => (
        <div key={cat.label} className={styles.barRow}>
          <div className={styles.barLabel}>
            <span className={styles.barIcon} style={{ color: cat.color }}>{cat.icon}</span>
            <span className={styles.barText}>{cat.label}</span>
            <span className={styles.barCount}>{cat.count}</span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                width: `${Math.max(4, (cat.count / maxCount) * 100)}%`,
                backgroundColor: cat.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  /* ── Render ──────────────────────────────── */

  return (
    <>
      <div
        className={styles.card}
        onClick={() => !loading && (categories.length > 0 || sections.length > 0) && setSheetOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !loading && (categories.length > 0 || sections.length > 0) && setSheetOpen(true); } }}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <BarChart3 size={16} />
          </div>
          <h2 className={styles.title}>Content voortgang</h2>
          {totalCount > 0 && <span className={styles.totalBadge}>{totalCount}</span>}
        </div>

        {/* Loading */}
        {loading && (
          <div className={styles.barList}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.barRow}>
                <div className={styles.barShimmer} />
              </div>
            ))}
          </div>
        )}

        {/* Category bars (preview) */}
        {!loading && categories.length > 0 && renderBars()}

        {/* Empty state */}
        {!loading && categories.length === 0 && sections.length === 0 && (
          <div className={styles.emptyState}>
            <Sparkles size={16} />
            Nog geen content gegenereerd
          </div>
        )}
      </div>

      {/* ── Sheet with Tabs ──────────────────────── */}
      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Content voortgang"
        icon={<BarChart3 size={18} />}
      >
        <Tabs defaultValue="overview">
          <TabList>
            <Tab value="overview">Overzicht</Tab>
            <Tab value="inventory">Inventaris</Tab>
          </TabList>

          {/* ── Tab: Overzicht (breakdown bars + stat blocks) ── */}
          <TabPanel value="overview">
            <div className={styles.tabContent}>
              {categories.length > 0 && renderBars()}

              {/* Stat blocks */}
              {sections.length > 0 && (
                <div className={styles.statRow}>
                  {sections.map(sec => (
                    <div key={sec.key} className={styles.statBlock}>
                      <div className={styles.statValue}>{sec.total}</div>
                      <div className={styles.statLabel}>{sec.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total summary */}
              {grandTotal > 0 && (
                <div className={styles.statRow}>
                  <div className={styles.statBlock}>
                    <div className={styles.statValue}>{grandTotal}</div>
                    <div className={styles.statLabel}>Totaal</div>
                  </div>
                </div>
              )}
            </div>
          </TabPanel>

          {/* ── Tab: Inventaris (full content list) ── */}
          <TabPanel value="inventory">
            <div className={styles.tabContent}>
              {sections.map(sec => (
                <div key={sec.key} className={styles.section}>
                  <button
                    className={styles.sectionHeader}
                    onClick={() => toggleSection(sec.key)}
                  >
                    <span className={styles.sectionIcon}>{sec.icon}</span>
                    <span className={styles.sectionTitle}>{sec.label}</span>
                    <span className={styles.sectionCount}>{sec.total} items</span>
                    <span className={styles.sectionChevron} data-open={openSections.has(sec.key)}>
                      <ChevronRight size={14} />
                    </span>
                  </button>
                  {openSections.has(sec.key) && renderSectionBody(sec)}
                </div>
              ))}

              {/* Navigate to full page */}
              <button
                className={styles.navLink}
                onClick={() => { setSheetOpen(false); navigate('/content'); }}
              >
                Bekijk alle content <ChevronRight size={14} />
              </button>
            </div>
          </TabPanel>
        </Tabs>
      </NavigationSheet>
    </>
  );
};
