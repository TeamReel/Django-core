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
import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Zap, ChevronRight, Shirt, Camera, Image,
  Upload, PlayCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
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

  // ── Action handler — stub for H1, full sheet-ification in H3 ──────
  const handleAction = useCallback((action: SmartAction) => {
    // H3: replace with inline sheet / CreateWizard events
    console.warn('[SmartActionsCard] Action stub — sheet pattern pending H3:', action.key);

    switch (action.mode.type) {
      case 'season-tab': {
        const base = orgSlug && clubSlugOrId && teamSlugOrId && seasonSlugOrId
          ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}`
          : null;
        if (base) {
          navigate(`${base}?tab=${encodeURIComponent(action.mode.tab)}`);
        } else {
          navigate(routes.dashboard());
        }
        break;
      }

      case 'navigate':
        navigate(action.mode.path);
        break;
    }
  }, [navigate, orgSlug, clubSlugOrId, teamSlugOrId, seasonSlugOrId]);

  // Parallel queries — deduped via shared hooks (D5)
  const { data: membersData, isLoading: membersLoading } = useProjectMembers(
    org?.slug,
    project?.slug,
  );

  const genFilters = useMemo(() => {
    if (!project) return undefined;
    return { status: 'completed', project: project.id } as Record<string, string>;
  }, [project?.id]);

  const { data: genData, isLoading: genLoading } = useGenerativeRequests(genFilters);

  const loading = (!org) ? false : (membersLoading || genLoading);

  // Derive actions from cached data
  const actions = useMemo<SmartAction[]>(() => {
    if (!org) return [];
    const computed: SmartAction[] = [];

    if (project && membersData && genData) {
      const memberList = membersData.results ?? [];
      const genItems = genData.results ?? [];

      // Build map: member_id -> set of completed subtypes
      const memberContentMap = new Map<string, Set<string>>();
      for (const req of genItems as any[]) {
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
        for (const member of memberList as any[]) {
          const memberUuid = member.membership_id || member.id;
          const completed = memberContentMap.get(memberUuid);
          if (!completed || !completed.has(type)) missing++;
        }
        missingByType[type] = missing;
      }

      // Generate actions for missing content types
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

    // Upload action if project
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
    return computed.slice(0, 4);
  }, [org, project, membersData, genData]);

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
