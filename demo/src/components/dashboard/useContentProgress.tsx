import { useMemo } from 'react';
import { User, Trophy, Calendar, BarChart3 } from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { MediaItem } from '@/types/api/media';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
import { queryKeys } from '../../utils/queryKeys';
import type {
  GenRequestItem,
  MediaItemExt,
  CategoryCount,
  ContentItem,
  MatchGroup,
  SectionData,
} from './contentProgressUtils';
import { SUBTYPE_OUTPUT, inferMediaItemSubtype } from './contentProgressUtils';

export function useContentProgress() {
  const { context } = useContextSwitcher();
  const project = context.project;

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

  const categories = useMemo<CategoryCount[]>(() => {
    const items = genData?.results ?? [];
    if (items.length === 0) return [];

    const counts: Record<string, number> = {};
    for (const item of items) {
      const gen = item as unknown as GenRequestItem;
      const tpl = typeof gen.template === 'object' ? gen.template : null;
      const tplType = tpl?.template_type || gen.template_type || 'custom';
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

  const sections = useMemo<SectionData[]>(() => {
    const genItems = genData?.results ?? [];
    const mediaItems = mediaData?.results ?? [];
    if (genItems.length === 0 && mediaItems.length === 0) return [];

    const seenMediaIds = new Set<string>();
    const matchMap = new Map<string, { title: string; date?: string; subtypes: Record<string, number> }>();
    const seasonSubtypes: Record<string, number> = {};
    const memberSubtypes: Record<string, number> = {};

    for (const req of genItems as unknown as GenRequestItem[]) {
      if (req.result?.media_item_id) seenMediaIds.add(req.result.media_item_id);
      const tpl = typeof req.template === 'object' ? req.template : null;
      const tplType = tpl?.template_type || '';
      const subtype = tpl?.template_subtype || String(req.input_data?.template_subtype || 'other');

      if (tplType === 'member') {
        memberSubtypes[subtype] = (memberSubtypes[subtype] || 0) + 1;
      } else if (tplType === 'season') {
        seasonSubtypes[subtype] = (seasonSubtypes[subtype] || 0) + 1;
      } else if (['pre_match', 'during_match', 'post_match'].includes(tplType)) {
        const actId = String(req.input_data?.activity_id || req.metadata?.activity_id || 'unknown');
        const matchTitle = String(req.input_data?.match_title || req.metadata?.match_title || req.input_data?.title || 'Wedstrijd');
        const matchDate = String(req.input_data?.match_date || req.metadata?.match_date || '');
        if (!matchMap.has(actId)) matchMap.set(actId, { title: matchTitle, date: matchDate, subtypes: {} });
        matchMap.get(actId)!.subtypes[subtype] = (matchMap.get(actId)!.subtypes[subtype] || 0) + 1;
      }
    }

    for (const item of mediaItems as unknown as MediaItemExt[]) {
      if (seenMediaIds.has(item.id)) continue;
      const actId = item.activity_id || item.activity;
      const mimeType = item.mime_type || '';
      const title = item.title || '';
      const subtype = inferMediaItemSubtype(title, mimeType);

      if (actId) {
        const matchTitle = item.activity_title || item.title || 'Wedstrijd';
        const matchDate = item.activity_date;
        if (!matchMap.has(actId)) matchMap.set(actId, { title: matchTitle, date: matchDate, subtypes: {} });
        matchMap.get(actId)!.subtypes[subtype] = (matchMap.get(actId)!.subtypes[subtype] || 0) + 1;
      } else if (item.member_id || item.member) {
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

  const maxCount = Math.max(1, ...categories.map(c => c.count));
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);
  const grandTotal = sections.reduce((s, sec) => s + sec.total, 0);

  return { loading, categories, sections, maxCount, totalCount, grandTotal };
}
