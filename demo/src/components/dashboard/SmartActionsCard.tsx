/**
 * SmartActionsCard — Context-aware quick actions for the dashboard.
 *
 * Analyzes the current state (team members, content completeness, matches)
 * and surfaces the most relevant actions the user should take next.
 *
 * All actions stay inline — no navigate-away:
 * - Content generation → CreateWizard via teamreel:open-quick-create event
 * - Upload → inline UploadSheet (NavigationSheet + FileUpload)
 * - Lineup → teamreel:open-match-sheet event → ActiveMatchCard opens lineup
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Zap, ChevronRight, Shirt, Camera, Image,
  Upload, PlayCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useGenerativeRequests } from '../../hooks/useGenerativeRequests';
import { useClosestMatch } from '../../hooks/useClosestMatch';
import { useMatchDayMode } from '../../hooks/useMatchDayMode';
import { useAppSelection } from '../../hooks/useAppSelection';
import { UploadSheet } from './UploadSheet';
import styles from './SmartActionsCard.module.css';

/** How an action executes — all inline, never navigate */
type ActionMode =
  | { type: 'create-wizard'; flow: 'content'; subtype?: string }
  | { type: 'upload' }
  | { type: 'match-sheet'; matchId: string; autoOpenLineup?: boolean };

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
  const org = context.organisation;
  const project = context.project;
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;

  // Upload sheet state
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);

  // ── Action handler — all inline, zero navigate ──────────────────
  const handleAction = useCallback((action: SmartAction) => {
    switch (action.mode.type) {
      case 'create-wizard':
        window.dispatchEvent(
          new CustomEvent('teamreel:open-quick-create', {
            detail: { flow: action.mode.flow, subtype: action.mode.subtype },
          }),
        );
        break;
      case 'upload':
        setUploadSheetOpen(true);
        break;
      case 'match-sheet':
        window.dispatchEvent(
          new CustomEvent('teamreel:open-match-sheet', {
            detail: {
              matchId: action.mode.matchId,
              autoOpenLineup: action.mode.autoOpenLineup,
            },
          }),
        );
        break;
    }
  }, []);

  // Parallel queries — deduped via shared hooks (D5)
  const { data: membersData, isLoading: membersLoading } = useProjectMembers(
    projectId,
  );

  const genFilters = useMemo(() => {
    if (!projectId) return undefined;
    return { status: 'completed', project: projectId } as Record<string, string>;
  }, [projectId]);

  const { data: genData, isLoading: genLoading } = useGenerativeRequests(genFilters);

  // Closest match — for lineup action + match-day mode
  const { data: matchData } = useClosestMatch(projectId);
  const activeMatch = matchData?.match ?? null;
  const lineupCount = matchData?.lineupCount ?? 0;

  // Match-day mode (H4) — filter to match-relevant actions only
  const matchDay = useMatchDayMode(activeMatch);

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
      for (const req of genItems) {
        const tpl = req.template as unknown as Record<string, string> | undefined;
        const tplType = tpl?.template_type || '';
        if (tplType !== 'member') continue;
        const inputData = req.input_data as Record<string, unknown> | undefined;
        const subtype = tpl?.template_subtype || (inputData?.template_subtype as string) || '';
        const memberIds: string[] = (inputData?.member_ids as string[]) || [];
        const singleMemberId = inputData?.member_id as string | undefined;
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
          const memberUuid = (member as unknown as Record<string, string>).membership_id || String(member.id);
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
            mode: { type: 'create-wizard', flow: 'content', subtype: type },
          });
        }
      }
    }

    // Lineup action — if active match has no lineup
    if (activeMatch && lineupCount === 0) {
      const matchTitle = activeMatch.title || `${activeMatch.project?.club_name || activeMatch.project?.name || 'Team'} vs ${activeMatch.opponent_project?.club_name || activeMatch.opponent_project?.name || 'Tegenstander'}`;
      computed.push({
        key: 'lineup-fill',
        label: 'Lineup invullen',
        subtitle: matchTitle,
        Icon: Shirt,
        colorClass: styles.colorBlue,
        priority: 90, // High — match without lineup is urgent
        mode: { type: 'match-sheet', matchId: activeMatch.id, autoOpenLineup: true },
      });
    }

    // Upload action if project — inline sheet
    if (project) {
      computed.push({
        key: 'upload-media',
        label: 'Foto\'s uploaden',
        subtitle: 'Action foto\'s of wedstrijdbeelden toevoegen',
        Icon: Upload,
        colorClass: styles.colorViolet,
        priority: 30,
        mode: { type: 'upload' },
      });
    }

    // Sort by priority (highest first) and limit to 4
    computed.sort((a, b) => b.priority - a.priority);

    // Match-day filter (H4): only show match-relevant actions on match day
    if (matchDay.isMatchDay) {
      const matchKeys = new Set(['lineup-fill', 'upload-media', 'missing-in_tenue', 'missing-profile_photo']);
      const filtered = computed.filter(a => matchKeys.has(a.key));
      return filtered.slice(0, 4);
    }

    return computed.slice(0, 4);
  }, [org, project, membersData, genData, activeMatch, lineupCount, matchDay.isMatchDay]);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <Zap size={16} />
          <h2 className={styles.title}>Aanbevolen acties</h2>
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
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <Zap size={16} />
          <h2 className={styles.title}>Aanbevolen acties</h2>
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

      {/* Inline upload sheet */}
      <UploadSheet
        isOpen={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
      />
    </>
  );
};
