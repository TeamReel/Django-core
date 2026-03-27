/**
 * useBatchGeneration — state, memos, effects and helpers for BatchGenerationModal.
 *
 * Delegates the heavy async execution to batchExecution.ts.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import {
  getTemplatesForContext,
  type AssetTemplate,
  type TemplateParameter,
} from '../../constants/assetTemplates';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { getApiBaseUrl } from '../../utils/apiBase';

import type { BatchMember, MemberParams, MemberJobStatus, BatchGenerationModalProps } from './batchTypes';
import { executeBatch } from './batchExecution';
import type { TeamreelAssets } from './teamreelAssetTypes';

// ============================================================================
// Return type
// ============================================================================

export interface UseBatchGenerationReturn {
  step: 'configure' | 'running' | 'done';
  selectedTemplateId: string;
  setSelectedTemplateId: React.Dispatch<React.SetStateAction<string>>;
  defaultParams: MemberParams;
  setDefaultParams: React.Dispatch<React.SetStateAction<MemberParams>>;
  memberOverrides: Record<string, MemberParams>;
  expandedMembers: Set<string>;
  jobStatuses: Record<string, MemberJobStatus>;
  currentIndex: number;
  memberTemplates: AssetTemplate[];
  selectedTemplate: AssetTemplate | undefined;
  getEffectiveParams: (memberId: string) => MemberParams;
  toggleMemberExpanded: (memberId: string) => void;
  setMemberParam: (memberId: string, key: string, value: string) => void;
  resetMemberOverrides: (memberId: string) => void;
  isParamVisible: (param: TemplateParameter, currentParams: MemberParams) => boolean;
  getInputAssetsForMember: (member: BatchMember, params: MemberParams) => Record<string, string | null>;
  startBatch: () => Promise<void>;
  cancelBatch: () => void;
  completedCount: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
}

export function useBatchGeneration(
  props: Pick<BatchGenerationModalProps, 'isOpen' | 'members' | 'projectId' | 'organisationId' | 'brandAssets'>,
): UseBatchGenerationReturn {
  const { isOpen, members, projectId, organisationId, brandAssets } = props;
  const apiBase = getApiBaseUrl();

  // ── State ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<'configure' | 'running' | 'done'>('configure');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('fullbody_in_tenue');
  const [defaultParams, setDefaultParams] = useState<MemberParams>({});
  const [memberOverrides, setMemberOverrides] = useState<Record<string, MemberParams>>({});
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [jobStatuses, setJobStatuses] = useState<Record<string, MemberJobStatus>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const abortRef = useRef(false);

  // ── Templates ──────────────────────────────────────────────────────
  const memberTemplates = useMemo(() => getTemplatesForContext('member'), []);
  const selectedTemplate = useMemo(
    () => memberTemplates.find((t) => t.id === selectedTemplateId) || memberTemplates[0],
    [memberTemplates, selectedTemplateId],
  );

  // Initialize default params when template changes
  useEffect(() => {
    if (!selectedTemplate) return;
    const defaults: MemberParams = {};
    for (const [key, param] of Object.entries(selectedTemplate.parameters)) {
      defaults[key] = param.default;
    }
    setDefaultParams(defaults);
    setMemberOverrides({});
    setExpandedMembers(new Set());
  }, [selectedTemplate]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('configure');
      setJobStatuses({});
      setCurrentIndex(0);
      abortRef.current = false;
    }
  }, [isOpen]);

  // ── Helpers ────────────────────────────────────────────────────────
  const getEffectiveParams = useCallback(
    (memberId: string): MemberParams => {
      const overrides = memberOverrides[memberId] || {};
      return { ...defaultParams, ...overrides };
    },
    [defaultParams, memberOverrides],
  );

  const toggleMemberExpanded = (memberId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const setMemberParam = (memberId: string, key: string, value: string) => {
    setMemberOverrides((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || {}), [key]: value },
    }));
  };

  const resetMemberOverrides = (memberId: string) => {
    setMemberOverrides((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  };

  const isParamVisible = (param: TemplateParameter, currentParams: MemberParams): boolean => {
    if (!param.visibleIf) return true;
    const depValue = currentParams[param.visibleIf.param];
    if (param.visibleIf.includes && !param.visibleIf.includes.includes(depValue)) return false;
    if (param.visibleIf.excludes && param.visibleIf.excludes.includes(depValue)) return false;
    return true;
  };

  const getInputAssetsForMember = useCallback(
    (member: BatchMember, params: MemberParams): Record<string, string | null> => {
      const kitType = params.kit_type || 'home';
      const kitUrl = brandAssets.kits[kitType] || brandAssets.kits['home'] || null;

      const needsFullbodyAsInput = selectedTemplate?.outputType === 'video'
        || selectedTemplate?.category === 'closeup';

      let personUrl: string | null;
      if (needsFullbodyAsInput) {
        personUrl = member.fullbodyUrls[kitType] || member.fullbodyUrls['home'] || member.profilePhotoUrl;
      } else if (kitType === 'legacy') {
        const tr = member.metadata?.teamreel_assets as TeamreelAssets | undefined;
        const legacyUrl = tr?.media?.legacy_photo?.url || tr?.old?.profile_photo_url;
        personUrl = legacyUrl || member.profilePhotoUrl;
      } else {
        personUrl = member.profilePhotoUrl;
      }

      return {
        logo: brandAssets.logo || null,
        sponsor: brandAssets.sponsor || null,
        reference: kitUrl,
        person: personUrl ? getAssetUrl(personUrl) : null,
      };
    },
    [brandAssets, selectedTemplate],
  );

  // ── Batch execution ────────────────────────────────────────────────
  const startBatch = useCallback(async () => {
    setStep('running');
    abortRef.current = false;

    await executeBatch({
      members,
      selectedTemplate,
      organisationId,
      projectId,
      apiBase,
      getEffectiveParams,
      getInputAssetsForMember,
      setJobStatuses,
      setCurrentIndex,
      abortRef,
    });

    setStep('done');
  }, [members, getEffectiveParams, getInputAssetsForMember, selectedTemplate, organisationId, projectId, apiBase]);

  const cancelBatch = () => { abortRef.current = true; };

  // ── Stats ──────────────────────────────────────────────────────────
  const completedCount = Object.values(jobStatuses).filter(
    (s) => s.status === 'success' || s.status === 'error' || s.status === 'skipped',
  ).length;
  const successCount = Object.values(jobStatuses).filter((s) => s.status === 'success').length;
  const errorCount = Object.values(jobStatuses).filter((s) => s.status === 'error').length;
  const skippedCount = Object.values(jobStatuses).filter((s) => s.status === 'skipped').length;

  return {
    step,
    selectedTemplateId,
    setSelectedTemplateId,
    defaultParams,
    setDefaultParams,
    memberOverrides,
    expandedMembers,
    jobStatuses,
    currentIndex,
    memberTemplates,
    selectedTemplate,
    getEffectiveParams,
    toggleMemberExpanded,
    setMemberParam,
    resetMemberOverrides,
    isParamVisible,
    getInputAssetsForMember,
    startBatch,
    cancelBatch,
    completedCount,
    successCount,
    errorCount,
    skippedCount,
  };
}
