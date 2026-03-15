/**
 * ContentProgressCard — Merged ContentBreakdownCard + ContentOverviewCard.
 *
 * Card preview: compact category bars (Spelers/Wedstrijd/Seizoen) + total badge.
 * Sheet: Tabs (design system) with "Overzicht" (bars) and "Inventaris" (full inventory).
 *
 * Data reuses useGenerativeRequests + media items query (TanStack Query deduplication).
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  BarChart3, Layers, Trophy, Calendar, User, ChevronRight,
  Image, Film, FileText, Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabList, Tab, TabPanel } from '@django-core/design-system';
import { api } from '@/api';
import type { MediaItem } from '@/types/api/media';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
import { queryKeys } from '../../utils/queryKeys';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './ContentProgressCard.module.css';

/* ── Helpers (from ContentOverviewCard) ──────────────── */

const SUBTYPE_LABELS: Record<string, string> = {
  flyer: 'Match Flyer', lineup: 'Lineup Video', lineup_flyer: 'Lineup Flyer',
  match_intro: 'Match Intro', poster: 'Elftalfoto', walkon: 'Walk-on Video',
  anthem: 'Anthem Video', goal: 'Doelpunt', score_update: 'Score Update',
  end_score: 'Eindstand', match_summary: 'Samenvatting', highlights: 'Highlights',
  profile_photo: 'Profielfoto', in_tenue: 'In Tenue', closeup: 'Close-up',
  short_intro: 'Korte Intro', video: 'Video', image: 'Afbeelding', other: 'Overig',
};

const SUBTYPE_OUTPUT: Record<string, 'image' | 'video' | 'text'> = {
  flyer: 'image', lineup: 'video', lineup_flyer: 'image', match_intro: 'video',
  poster: 'image', walkon: 'video', anthem: 'video', goal: 'video',
  score_update: 'image', end_score: 'image', match_summary: 'text', highlights: 'video',
  profile_photo: 'image', in_tenue: 'image', closeup: 'image', short_intro: 'video',
  video: 'video', image: 'image', other: 'image',
};

function inferMediaItemSubtype(title: string, mimeType: string): string {
  const n = title.toLowerCase();
  if (n.includes('lineup') && mimeType.startsWith('video/')) return 'lineup';
  if (n.includes('lineup')) return 'lineup_flyer';
  if (n.includes('flyer')) return 'flyer';
  if (n.includes('intro')) return 'match_intro';
  if (n.includes('poster') || n.includes('elftal')) return 'poster';
  if (n.includes('walkon') || n.includes('walk-on')) return 'walkon';
  if (n.includes('anthem')) return 'anthem';
  if (n.includes('goal') || n.includes('doelpunt')) return 'goal';
  if (n.includes('end') && n.includes('score')) return 'end_score';
  if (n.includes('score')) return 'score_update';
  if (n.includes('highlight')) return 'highlights';
  if (n.includes('profile')) return 'profile_photo';
  if (n.includes('tenue')) return 'in_tenue';
  if (n.includes('closeup') || n.includes('close-up')) return 'closeup';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'other';
}

/* ── Types ──────────────────────────────────── */

interface CategoryCount {
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

interface ContentItem {
  subtype: string;
  count: number;
  outputType: 'image' | 'video' | 'text';
}

interface MatchGroup {
  matchId: string;
  title: string;
  date?: string;
  items: ContentItem[];
  total: number;
}

interface SectionData {
  key: string;
  label: string;
  icon: React.ReactNode;
  total: number;
  matches?: MatchGroup[];
  items?: ContentItem[];
}

/* ── Component ─────────────────────────────── */

export const ContentProgressCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const project = context.project;

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

  // ── Shared queries (deduped via TanStack Query) ──

  const genFilters = useMemo(() => {
    const p: Record<string, string> = { status: 'completed', ordering: '-created_at' };
    if (project) p.project = project.id;
    return p;
  }, [project?.id]);

  const { data: genData, isLoading: genLoading } = useGenerativeRequests(genFilters);

  const mediaFilters = useMemo(() => {
    const p: Record<string, string> = { ordering: '-created_at' };
    if (project) p.project = project.id;
    return p;
  }, [project?.id]);

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: queryKeys.media.items(mediaFilters),
    queryFn: () => api.list<MediaItem>('/media/items/', { params: mediaFilters, pageSize: 500 }),
    staleTime: 2 * 60 * 1000,
  });

  const loading = genLoading || mediaLoading;

  // ── Breakdown categories (from ContentBreakdownCard) ──

  const categories = useMemo<CategoryCount[]>(() => {
    const items = genData?.results ?? [];
    if (items.length === 0) return [];

    const counts: Record<string, number> = {};
    for (const item of items) {
      const tplType = (item as any).template?.template_type || (item as any).template_type || 'custom';
      counts[tplType] = (counts[tplType] || 0) + 1;
    }

    const memberCount = counts['member'] || 0;
    const matchCount = (counts['pre_match'] || 0) + (counts['during_match'] || 0) + (counts['post_match'] || 0);
    const seasonCount = counts['season'] || 0;
    const otherCount = counts['custom'] || 0;

    const cats: CategoryCount[] = [];
    if (memberCount > 0 || matchCount > 0 || seasonCount > 0 || otherCount > 0) {
      cats.push({ label: 'Spelers', icon: <User size={14} />, count: memberCount, color: 'var(--color-blue-400)' });
      cats.push({ label: 'Wedstrijd', icon: <Trophy size={14} />, count: matchCount, color: 'var(--color-red-400)' });
      cats.push({ label: 'Seizoen', icon: <Calendar size={14} />, count: seasonCount, color: 'var(--color-amber-400)' });
      if (otherCount > 0) {
        cats.push({ label: 'Overig', icon: <BarChart3 size={14} />, count: otherCount, color: 'var(--color-green-400)' });
      }
    }
    return cats;
  }, [genData]);

  const maxCount = Math.max(1, ...categories.map(c => c.count));
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  // ── Inventory sections (from ContentOverviewCard) ──

  const sections = useMemo<SectionData[]>(() => {
    const genItems = genData?.results ?? [];
    const mediaItems = mediaData?.results ?? [];
    if (genItems.length === 0 && mediaItems.length === 0) return [];

    const seenMediaIds = new Set<string>();
    const matchMap = new Map<string, { title: string; date?: string; subtypes: Record<string, number> }>();
    const seasonSubtypes: Record<string, number> = {};
    const memberSubtypes: Record<string, number> = {};

    for (const req of genItems as any[]) {
      if (req.result?.media_item_id) seenMediaIds.add(req.result.media_item_id);
      const tplType = req.template?.template_type || '';
      const subtype = req.template?.template_subtype || req.input_data?.template_subtype || 'other';

      if (tplType === 'member') {
        memberSubtypes[subtype] = (memberSubtypes[subtype] || 0) + 1;
      } else if (tplType === 'season') {
        seasonSubtypes[subtype] = (seasonSubtypes[subtype] || 0) + 1;
      } else if (['pre_match', 'during_match', 'post_match'].includes(tplType)) {
        const actId = req.input_data?.activity_id || req.metadata?.activity_id || 'unknown';
        const matchTitle = req.input_data?.match_title || req.metadata?.match_title || req.input_data?.title || 'Wedstrijd';
        const matchDate = req.input_data?.match_date || req.metadata?.match_date;
        if (!matchMap.has(actId)) matchMap.set(actId, { title: matchTitle, date: matchDate, subtypes: {} });
        matchMap.get(actId)!.subtypes[subtype] = (matchMap.get(actId)!.subtypes[subtype] || 0) + 1;
      }
    }

    for (const item of mediaItems) {
      if (seenMediaIds.has(item.id)) continue;
      const actId = item.activity_id || (item as any).activity;
      const mimeType = item.mime_type || '';
      const title = item.title || '';
      const subtype = inferMediaItemSubtype(title, mimeType);

      if (actId) {
        const matchTitle = item.activity_title || item.title || 'Wedstrijd';
        const matchDate = (item as any).activity_date;
        if (!matchMap.has(actId)) matchMap.set(actId, { title: matchTitle, date: matchDate, subtypes: {} });
        matchMap.get(actId)!.subtypes[subtype] = (matchMap.get(actId)!.subtypes[subtype] || 0) + 1;
      } else if ((item as any).member_id || (item as any).member) {
        memberSubtypes[subtype] = (memberSubtypes[subtype] || 0) + 1;
      }
    }

    const result: SectionData[] = [];

    const matchGroups: MatchGroup[] = Array.from(matchMap.entries()).map(([mid, m]) => {
      const groupItems: ContentItem[] = Object.entries(m.subtypes).map(([st, count]) => ({
        subtype: st, count, outputType: SUBTYPE_OUTPUT[st] || 'image',
      }));
      return {
        matchId: mid, title: m.title, date: m.date,
        items: groupItems.sort((a, b) => b.count - a.count),
        total: groupItems.reduce((s, i) => s + i.count, 0),
      };
    }).sort((a, b) => b.total - a.total);

    const matchTotal = matchGroups.reduce((s, g) => s + g.total, 0);
    if (matchTotal > 0) {
      result.push({ key: 'match', label: 'Wedstrijd', icon: <Trophy size={14} />, total: matchTotal, matches: matchGroups });
    }

    const seasonItems: ContentItem[] = Object.entries(seasonSubtypes).map(([st, count]) => ({
      subtype: st, count, outputType: SUBTYPE_OUTPUT[st] || 'image',
    })).sort((a, b) => b.count - a.count);
    const seasonTotal = seasonItems.reduce((s, i) => s + i.count, 0);
    if (seasonTotal > 0) {
      result.push({ key: 'season', label: 'Seizoen', icon: <Calendar size={14} />, total: seasonTotal, items: seasonItems });
    }

    const memberItems: ContentItem[] = Object.entries(memberSubtypes).map(([st, count]) => ({
      subtype: st, count, outputType: SUBTYPE_OUTPUT[st] || 'image',
    })).sort((a, b) => b.count - a.count);
    const memberTotal = memberItems.reduce((s, i) => s + i.count, 0);
    if (memberTotal > 0) {
      result.push({ key: 'member', label: 'Spelers', icon: <User size={14} />, total: memberTotal, items: memberItems });
    }

    return result;
  }, [genData, mediaData]);

  const grandTotal = sections.reduce((s, sec) => s + sec.total, 0);

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
          <span className={styles.title}>Content voortgang</span>
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
