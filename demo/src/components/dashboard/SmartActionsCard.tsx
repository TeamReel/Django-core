/**
 * SmartActionsCard — Context-aware quick actions for the dashboard.
 *
 * Analyzes the current state (team members, content completeness, matches)
 * and surfaces the most relevant actions the user should take next.
 *
 * Actions open the correct modal / wizard directly:
 * - Match actions → open MatchWizard via teamreel:open-quick-create event
 * - Member content → navigate to season media tab (batch generation)
 * - Upload → navigate to media library
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Zap, ChevronRight, Shirt, Camera, Image,
  Upload, PlayCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/api';
import { useAppSelection } from '../../hooks/useAppSelection';
import styles from './SmartActionsCard.module.css';

/** How an action opens: navigate to page, or navigate with tab */
type ActionMode =
  | { type: 'navigate'; path: string }
  | { type: 'season-tab'; tab: string };

interface SmartAction {
  key: string;
  label: string;
  subtitle: string;
  Icon: LucideIcon;
  /** CSS class name for themed color (e.g. styles.colorIndigo) */
  colorClass: string;
  priority: number;
  mode: ActionMode;
}

/** Expected member content types for a complete profile */
const MEMBER_CONTENT_TYPES = ['profile_photo', 'in_tenue', 'closeup', 'short_intro'] as const;

export const SmartActionsCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation;
  const project = context.project;
  const { orgSlug, clubSlugOrId, teamSlugOrId, seasonSlugOrId } = useAppSelection();

  const [actions, setActions] = useState<SmartAction[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Action handler — opens the right modal/page ──────────────────
  const handleAction = useCallback((action: SmartAction) => {
    switch (action.mode.type) {
      case 'season-tab': {
        // Navigate to the current season page with the right tab
        const base = orgSlug && clubSlugOrId && teamSlugOrId && seasonSlugOrId
          ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}`
          : null;
        if (base) {
          navigate(`${base}?tab=${encodeURIComponent(action.mode.tab)}`);
        } else {
          // Fallback: just go to dashboard
          navigate(routes.dashboard());
        }
        break;
      }

      case 'navigate':
        navigate(action.mode.path);
        break;
    }
  }, [navigate, orgSlug, clubSlugOrId, teamSlugOrId, seasonSlugOrId]);

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

        // ── 1. Fetch member count + generation requests in parallel ──
        const fetches: Promise<unknown>[] = [];

        // Members (if project context)
        if (project) {
          fetches.push(
            api.list<any>(`/organisations/${org.slug}/projects/${project.slug}/members/`, { pageSize: 100 })
              .catch(() => null)
          );
        } else {
          fetches.push(Promise.resolve(null));
        }

        // Generation requests (completed member content)
        if (project) {
          fetches.push(
            api.list<any>('/generative/requests/', { params: { status: 'completed', project: project.id }, pageSize: 500 })
              .catch(() => null)
          );
        } else {
          fetches.push(Promise.resolve(null));
        }

        const [membersData, genData] = await Promise.all(fetches);
        if (cancelled) return;

        // ── 2. Analyze member content completeness ──
        if (project && membersData && genData) {
          const memberList = (membersData as any)?.results ?? [];
          const genItems = (genData as any)?.results ?? [];

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
          // colorClass maps to themed CSS classes in the module
          const typeConfig: Record<string, { label: string; Icon: LucideIcon; colorClass: string }> = {
            in_tenue:      { label: 'Tenue foto',  Icon: Shirt,      colorClass: styles.colorIndigo },
            profile_photo: { label: 'Profielfoto', Icon: Camera,     colorClass: styles.colorPink },
            closeup:       { label: 'Close-up',    Icon: Image,      colorClass: styles.colorAmber },
            short_intro:   { label: 'Intro video', Icon: PlayCircle, colorClass: styles.colorGreen },
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
                colorClass: cfg.colorClass,
                priority: missing === totalMembers ? 100 : 80 + (missing / totalMembers) * 20,
                mode: { type: 'season-tab', tab: 'media' },
              });
            }
          }
        }

        // ── 3. Upload action if project ──
        if (project) {
          computed.push({
            key: 'upload-media',
            label: 'Foto\'s uploaden',
            subtitle: 'Action foto\'s of wedstrijdbeelden toevoegen',
            Icon: Upload,
            colorClass: styles.colorViolet,
            priority: 30,
            mode: { type: 'navigate', path: '/medialib' },
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
  }, [org?.slug, project?.slug, project?.id]);

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
            className={`${styles.actionItem} ${action.colorClass}`}
            onClick={() => handleAction(action)}
          >
            <div className={styles.actionIcon}>
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
