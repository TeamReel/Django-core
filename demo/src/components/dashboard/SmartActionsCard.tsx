/**
 * SmartActionsCard — Context-aware quick actions for the dashboard.
 *
 * Analyzes the current state (team members, content completeness, matches)
 * and surfaces the most relevant actions the user should take next.
 *
 * Examples:
 * - "4 spelers missen een tenue" → navigates to batch generate
 * - "Wedstrijd flyer aanmaken" → navigates to match detail
 * - "Upload action foto's" → navigates to media upload
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Zap, ChevronRight, Shirt, Camera, Image, FileImage,
  Trophy, Users, Upload, Sparkles, PlayCircle, CalendarCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiBase';
import styles from './SmartActionsCard.module.css';

function extractItems<T = any>(json: any): T[] {
  if (Array.isArray(json)) return json;
  if (json?.data && Array.isArray(json.data)) return json.data;
  if (json?.results && Array.isArray(json.results)) return json.results;
  return [];
}

interface SmartAction {
  key: string;
  label: string;
  subtitle: string;
  Icon: LucideIcon;
  color: string;
  priority: number; // higher = show first
  path: string;
}

/** Expected member content types for a complete profile */
const MEMBER_CONTENT_TYPES = ['profile_photo', 'in_tenue', 'closeup', 'short_intro'] as const;

export const SmartActionsCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();
  const org = context.organisation as any;
  const project = context.project as any;

  const [actions, setActions] = useState<SmartAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const computed: SmartAction[] = [];
        const projectParam = project ? `&project=${project.id}` : '';

        // ── 1. Fetch member count + generation requests in parallel ──
        const fetches: Promise<any>[] = [];

        // Members (if project context)
        if (project) {
          fetches.push(
            fetch(
              `${apiBaseUrl}/api/v1/organisations/${org.slug}/projects/${project.slug}/members/?page_size=100`,
              { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
            ).then(r => r.ok ? r.json() : null).catch(() => null)
          );
        } else {
          fetches.push(Promise.resolve(null));
        }

        // Generation requests (completed member content)
        if (project) {
          fetches.push(
            fetch(
              `${apiBaseUrl}/api/v1/generative/requests/?status=completed&project=${project.id}&page_size=500`,
              { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
            ).then(r => r.ok ? r.json() : null).catch(() => null)
          );
        } else {
          fetches.push(Promise.resolve(null));
        }

        // Upcoming match
        const now = new Date().toISOString();
        fetches.push(
          fetch(
            `${apiBaseUrl}/api/v1/activities/?activity_type=match&start_time__gte=${encodeURIComponent(now)}&ordering=start_time&page_size=1${projectParam}`,
            { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
          ).then(r => r.ok ? r.json() : null).catch(() => null)
        );

        const [membersData, genData, matchData] = await Promise.all(fetches);
        if (cancelled) return;

        // ── 2. Analyze member content completeness ──
        if (project && membersData && genData) {
          const memberList = extractItems<any>(membersData);
          const genItems = extractItems<any>(genData);

          // Build map: member_id -> set of completed subtypes
          const memberContentMap = new Map<string, Set<string>>();
          for (const req of genItems) {
            const tplType = req.template?.template_type || '';
            if (tplType !== 'member') continue;
            const subtype = req.template?.template_subtype || req.input_data?.template_subtype || '';
            const memberIds: string[] = req.input_data?.member_ids || [];
            const singleMemberId = req.input_data?.member_id;
            const allIds = singleMemberId ? [singleMemberId, ...memberIds] : memberIds;
            for (const mid of allIds) {
              if (!memberContentMap.has(mid)) memberContentMap.set(mid, new Set());
              if (subtype) memberContentMap.get(mid)!.add(subtype);
            }
          }

          const totalMembers = memberList.length;

          // Count missing per type
          const missingByType: Record<string, number> = {};
          for (const type of MEMBER_CONTENT_TYPES) {
            let missing = 0;
            for (const member of memberList) {
              const memberUuid = member.membership_id || member.id;
              const completed = memberContentMap.get(memberUuid);
              if (!completed || !completed.has(type)) missing++;
            }
            missingByType[type] = missing;
          }

          // Generate actions for missing content types
          const typeConfig: Record<string, { label: string; Icon: LucideIcon; color: string }> = {
            in_tenue: { label: 'Tenue foto', Icon: Shirt, color: '#6366f1' },
            profile_photo: { label: 'Profielfoto', Icon: Camera, color: '#ec4899' },
            closeup: { label: 'Close-up', Icon: Image, color: '#f59e0b' },
            short_intro: { label: 'Intro video', Icon: PlayCircle, color: '#22c55e' },
          };

          for (const type of MEMBER_CONTENT_TYPES) {
            const missing = missingByType[type];
            if (missing > 0 && totalMembers > 0) {
              const cfg = typeConfig[type];
              const pct = Math.round(((totalMembers - missing) / totalMembers) * 100);
              computed.push({
                key: `missing-${type}`,
                label: `${cfg.label} genereren`,
                subtitle: `${missing} van ${totalMembers} spelers mist een ${cfg.label.toLowerCase()} (${pct}% klaar)`,
                Icon: cfg.Icon,
                color: cfg.color,
                priority: missing === totalMembers ? 100 : 80 + (missing / totalMembers) * 20,
                path: `/teams/${project.slug || project.id}/squad`,
              });
            }
          }
        }

        // ── 3. Upcoming match actions ──
        if (matchData) {
          const matches = extractItems<any>(matchData);
          if (matches.length > 0) {
            const nextMatch = matches[0];
            const matchDate = new Date(nextMatch.start_time);
            const daysUntil = Math.ceil((matchDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const opponentName = nextMatch.opponent_project?.name || nextMatch.title?.split(' vs ')?.[1] || 'Tegenstander';
            const matchSlug = nextMatch.slug || nextMatch.id;

            if (daysUntil <= 7) {
              computed.push({
                key: 'match-flyer',
                label: 'Wedstrijd flyer maken',
                subtitle: `vs ${opponentName} — ${daysUntil <= 0 ? 'Vandaag' : daysUntil === 1 ? 'Morgen' : `Over ${daysUntil} dagen`}`,
                Icon: FileImage,
                color: '#ec4899',
                priority: daysUntil <= 1 ? 95 : 70,
                path: `/matches/${matchSlug}`,
              });

              computed.push({
                key: 'match-lineup',
                label: 'Opstelling invullen',
                subtitle: `Selectie voor ${opponentName} instellen`,
                Icon: Users,
                color: '#6366f1',
                priority: daysUntil <= 1 ? 90 : 65,
                path: `/matches/${matchSlug}`,
              });
            }
          }
        }

        // ── 4. Upload action if project ──
        if (project) {
          computed.push({
            key: 'upload-media',
            label: 'Foto\'s uploaden',
            subtitle: 'Action foto\'s of wedstrijdbeelden toevoegen',
            Icon: Upload,
            color: '#8b5cf6',
            priority: 30,
            path: '/media',
          });
        }

        // Sort by priority (highest first) and limit to 4
        computed.sort((a, b) => b.priority - a.priority);
        if (!cancelled) setActions(computed.slice(0, 4));
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [apiBaseUrl, org?.slug, project?.slug, project?.id]);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <Zap size={16} />
          <span className={styles.title}>Aanbevolen acties</span>
        </div>
        <div className={styles.actionList}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.shimmer} />
          ))}
        </div>
      </div>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Zap size={16} />
        <span className={styles.title}>Aanbevolen acties</span>
      </div>
      <div className={styles.actionList}>
        {actions.map(action => (
          <button
            key={action.key}
            className={styles.actionItem}
            onClick={() => navigate(action.path)}
          >
            <div
              className={styles.actionIcon}
              style={{ background: `color-mix(in srgb, ${action.color} 12%, transparent)`, color: action.color }}
            >
              <action.Icon size={18} />
            </div>
            <div className={styles.actionText}>
              <span className={styles.actionLabel}>{action.label}</span>
              <span className={styles.actionSubtitle}>{action.subtitle}</span>
            </div>
            <ChevronRight size={16} className={styles.actionArrow} />
          </button>
        ))}
      </div>
    </div>
  );
};
