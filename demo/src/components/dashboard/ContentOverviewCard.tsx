/**
 * ContentOverviewCard — Full content inventory per season & match.
 *
 * Groups content from both GenerationRequests AND MediaItems:
 * - Match content: grouped by match, per content subtype (flyer, lineup, etc.)
 * - Season content: season-level templates
 * - Member content: player profile media
 *
 * Uses both generation request API and media items API to ensure all
 * content is shown, including items created outside the generation pipeline
 * (e.g., lineup videos, match flyers created directly).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Layers, Trophy, Calendar, User, ChevronRight,
  Image, Film, FileText, Sparkles,
} from 'lucide-react';
import { api } from '@/api';
import styles from './ContentOverviewCard.module.css';

/* ── Helpers ──────────────────────────────────────────── */

/** Map subtype → readable Dutch label */
const SUBTYPE_LABELS: Record<string, string> = {
  flyer: 'Match Flyer',
  lineup: 'Lineup Video',
  lineup_flyer: 'Lineup Flyer',
  match_intro: 'Match Intro',
  poster: 'Elftalfoto',
  walkon: 'Walk-on Video',
  anthem: 'Anthem Video',
  goal: 'Doelpunt',
  score_update: 'Score Update',
  end_score: 'Eindstand',
  match_summary: 'Samenvatting',
  highlights: 'Highlights',
  profile_photo: 'Profielfoto',
  in_tenue: 'In Tenue',
  closeup: 'Close-up',
  short_intro: 'Korte Intro',
  video: 'Video',
  image: 'Afbeelding',
  other: 'Overig',
};

/** Map subtype → output type for chip coloring */
const SUBTYPE_OUTPUT: Record<string, 'image' | 'video' | 'text'> = {
  flyer: 'image', lineup: 'video', lineup_flyer: 'image', match_intro: 'video',
  poster: 'image', walkon: 'video', anthem: 'video', goal: 'video',
  score_update: 'image', end_score: 'image', match_summary: 'text', highlights: 'video',
  profile_photo: 'image', in_tenue: 'image', closeup: 'image', short_intro: 'video',
  video: 'video', image: 'image', other: 'image',
};

/** Derive subtype from MediaItem title or mime_type */
function inferMediaItemSubtype(title: string, mimeType: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes('lineup') && mimeType.startsWith('video/')) return 'lineup';
  if (normalized.includes('lineup')) return 'lineup_flyer';
  if (normalized.includes('flyer')) return 'flyer';
  if (normalized.includes('intro')) return 'match_intro';
  if (normalized.includes('poster') || normalized.includes('elftal')) return 'poster';
  if (normalized.includes('walkon') || normalized.includes('walk-on')) return 'walkon';
  if (normalized.includes('anthem')) return 'anthem';
  if (normalized.includes('goal') || normalized.includes('doelpunt')) return 'goal';
  if (normalized.includes('score')) return 'score_update';
  if (normalized.includes('end') && normalized.includes('score')) return 'end_score';
  if (normalized.includes('highlight')) return 'highlights';
  if (normalized.includes('profile')) return 'profile_photo';
  if (normalized.includes('tenue')) return 'in_tenue';
  if (normalized.includes('closeup') || normalized.includes('close-up')) return 'closeup';
  // Fallback based on mime type
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'other';
}

/* ── Types ──────────────────────────────────────────────── */

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
  matches?: MatchGroup[];  // for match content
  items?: ContentItem[];   // for season / member
}

/* ── Component ─────────────────────────────────────────── */

export const ContentOverviewCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['match']));
  const [loading, setLoading] = useState(true);
  const project = context.project as any;

  const toggleSection = useCallback((key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const genParams: Record<string, string> = {
          status: 'completed',
          ordering: '-created_at',
        };
        if (project) genParams.project = project.id;

        const mediaParams: Record<string, string> = {
          ordering: '-created_at',
        };
        if (project) mediaParams.project = project.id;

        // Fetch both GenerationRequests AND MediaItems in parallel
        const [genData, mediaData] = await Promise.all([
          api.list<any>('/generative/requests/', { params: genParams, pageSize: 500 }),
          api.list<any>('/media/items/', { params: mediaParams, pageSize: 500 }),
        ]);

        // Track seen IDs to avoid double-counting (some MediaItems are linked to GenRequests)
        const seenMediaIds = new Set<string>();

        // Categorize by template_type + subtype + activity
        const matchMap = new Map<string, { title: string; date?: string; subtypes: Record<string, number> }>();
        const seasonSubtypes: Record<string, number> = {};
        const memberSubtypes: Record<string, number> = {};

        // Process GenerationRequests
        {
          const genItems = genData.results;

          for (const req of genItems) {
            // Track linked media IDs to avoid double-counting
            if (req.result?.media_item_id) {
              seenMediaIds.add(req.result.media_item_id);
            }

            const tplType = req.template?.template_type || '';
            const subtype = req.template?.template_subtype || req.input_data?.template_subtype || 'other';

            if (tplType === 'member') {
              memberSubtypes[subtype] = (memberSubtypes[subtype] || 0) + 1;
            } else if (tplType === 'season') {
              seasonSubtypes[subtype] = (seasonSubtypes[subtype] || 0) + 1;
            } else if (['pre_match', 'during_match', 'post_match'].includes(tplType)) {
              const actId = req.input_data?.activity_id || req.metadata?.activity_id || 'unknown';
              const matchTitle = req.input_data?.match_title ||
                req.metadata?.match_title ||
                req.input_data?.title ||
                'Wedstrijd';
              const matchDate = req.input_data?.match_date || req.metadata?.match_date;

              if (!matchMap.has(actId)) {
                matchMap.set(actId, { title: matchTitle, date: matchDate, subtypes: {} });
              }
              const m = matchMap.get(actId)!;
              m.subtypes[subtype] = (m.subtypes[subtype] || 0) + 1;
            }
          }
        }

        // Process MediaItems (only those not already counted)
        {
          const mediaItems = mediaData.results;

          for (const item of mediaItems) {
            // Skip if already counted via GenerationRequest
            if (seenMediaIds.has(item.id)) continue;

            const actId = item.activity_id || item.activity;
            const mimeType = item.mime_type || '';
            const title = item.title || '';
            const subtype = inferMediaItemSubtype(title, mimeType);

            // If has activity_id, treat as match content
            if (actId) {
              const matchTitle = item.activity_title || item.title || 'Wedstrijd';
              const matchDate = item.activity_date;

              if (!matchMap.has(actId)) {
                matchMap.set(actId, { title: matchTitle, date: matchDate, subtypes: {} });
              }
              const m = matchMap.get(actId)!;
              m.subtypes[subtype] = (m.subtypes[subtype] || 0) + 1;
            } else if (item.member_id || item.member) {
              // Member content
              memberSubtypes[subtype] = (memberSubtypes[subtype] || 0) + 1;
            }
            // Note: MediaItems without activity or member are not displayed (no clear category)
          }
        }

        // Build sections
        const result: SectionData[] = [];

        // Match content
        const matchGroups: MatchGroup[] = Array.from(matchMap.entries()).map(([mid, m]) => {
          const groupItems: ContentItem[] = Object.entries(m.subtypes).map(([st, count]) => ({
            subtype: st,
            count,
            outputType: SUBTYPE_OUTPUT[st] || 'image',
          }));
          return {
            matchId: mid,
            title: m.title,
            date: m.date,
            items: groupItems.sort((a, b) => b.count - a.count),
            total: groupItems.reduce((s, i) => s + i.count, 0),
          };
        }).sort((a, b) => b.total - a.total);

        const matchTotal = matchGroups.reduce((s, g) => s + g.total, 0);
        if (matchTotal > 0) {
          result.push({
            key: 'match',
            label: 'Wedstrijd',
            icon: <Trophy size={14} />,
            total: matchTotal,
            matches: matchGroups,
          });
        }

        // Season content
        const seasonItems: ContentItem[] = Object.entries(seasonSubtypes).map(([st, count]) => ({
          subtype: st,
          count,
          outputType: SUBTYPE_OUTPUT[st] || 'image',
        })).sort((a, b) => b.count - a.count);
        const seasonTotal = seasonItems.reduce((s, i) => s + i.count, 0);
        if (seasonTotal > 0) {
          result.push({
            key: 'season',
            label: 'Seizoen',
            icon: <Calendar size={14} />,
            total: seasonTotal,
            items: seasonItems,
          });
        }

        // Member content
        const memberItems: ContentItem[] = Object.entries(memberSubtypes).map(([st, count]) => ({
          subtype: st,
          count,
          outputType: SUBTYPE_OUTPUT[st] || 'image',
        })).sort((a, b) => b.count - a.count);
        const memberTotal = memberItems.reduce((s, i) => s + i.count, 0);
        if (memberTotal > 0) {
          result.push({
            key: 'member',
            label: 'Spelers',
            icon: <User size={14} />,
            total: memberTotal,
            items: memberItems,
          });
        }

        if (!cancelled) setSections(result);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [project?.id]);

  const grandTotal = sections.reduce((s, sec) => s + sec.total, 0);

  if (!loading && sections.length === 0) return null;

  /* ── Render ───────────────────────────────── */
  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Layers size={16} />
        </div>
        <span className={styles.title}>Content inventaris</span>
        {grandTotal > 0 && <span className={styles.totalBadge}>{grandTotal}</span>}
      </div>

      {/* Summary stat blocks */}
      {!loading && sections.length > 0 && (
        <div className={styles.statRow}>
          {sections.map(sec => (
            <div key={sec.key} className={styles.statBlock}>
              <div className={styles.statValue}>{sec.total}</div>
              <div className={styles.statLabel}>{sec.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div>
          <div className={styles.shimmer} style={{ width: '60%' }} />
          <div className={styles.shimmer} style={{ width: '80%' }} />
          <div className={styles.shimmer} style={{ width: '45%' }} />
        </div>
      )}

      {/* Sections */}
      {!loading && sections.map(sec => (
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

          {openSections.has(sec.key) && sec.matches && (
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
                      <span
                        key={item.subtype}
                        className={styles.typeChip}
                        data-type={item.outputType}
                      >
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

          {openSections.has(sec.key) && sec.items && (
            <div className={styles.typeChips} style={{ paddingTop: 'var(--space-2)' }}>
              {sec.items.map(item => (
                <span
                  key={item.subtype}
                  className={styles.typeChip}
                  data-type={item.outputType}
                >
                  {item.outputType === 'video' ? <Film size={10} /> : item.outputType === 'text' ? <FileText size={10} /> : <Image size={10} />}
                  {SUBTYPE_LABELS[item.subtype] || item.subtype}
                  {item.count > 1 && ` ×${item.count}`}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {!loading && sections.length === 0 && (
        <div className={styles.emptyState}>
          <Sparkles size={16} style={{ marginRight: 'var(--space-2)' }} />
          Nog geen content gegenereerd
        </div>
      )}
    </div>
  );
};
