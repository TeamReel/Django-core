/**
 * batchExecution — pure async functions for batch AI generation.
 *
 * Separated from the hook so the 370-line startBatch logic can live
 * independently and be tested without React.
 */
import type { AssetTemplate } from '../../constants/assetTemplates';
import { api, ApiError } from '@/api';
import { logger } from '@/utils/logger';
import type { BatchMember, MemberParams, MemberJobStatus } from './batchTypes';

/** Response from /video/jobs/process-all-variants/ */
interface ProcessVariantsResponse {
  status?: string;
  total_queued?: number;
  [key: string]: unknown;
}
/** Member detail from /projects/:id/members/:id/ */
interface MemberDetailResponse {
  id?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}
/** Shape of a single variant from generation response. */
interface GenerationVariant {
  error?: string;
  storage_path?: string;
  storage_info?: { storage_path?: string; file_size_bytes?: number };
  presigned_url?: string;
  video_url?: string;
  image_base64?: string;
  filename?: string;
  mime_type?: string;
  label?: string;
  [key: string]: unknown;
}

/** Response from /generative/assets/generate/ */
interface GenerateResponse {
  task_id?: string;
  variants?: Record<string, unknown>[];
  [key: string]: unknown;
}
/** Response from /generative/assets/generate/:id/status/ */
interface GenerateStatusResponse {
  status?: string;
  error?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}
/** Response from /generative/assets/save/ */
interface SaveAssetResponse {
  storage_path?: string;
  [key: string]: unknown;
}
/** Response from PATCH /projects/:id/members/:id/ */
interface MemberPatchResponse {
  id?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

type SetJobStatuses = React.Dispatch<React.SetStateAction<Record<string, MemberJobStatus>>>;

export interface BatchContext {
  members: BatchMember[];
  selectedTemplate: AssetTemplate;
  organisationId: string;
  projectId: string;
  apiBase: string;
  getEffectiveParams: (memberId: string) => MemberParams;
  getInputAssetsForMember: (member: BatchMember, params: MemberParams) => Record<string, string | null>;
  setJobStatuses: SetJobStatuses;
  setCurrentIndex: (i: number) => void;
  abortRef: React.MutableRefObject<boolean>;
}

// ── Public: run batch for all members ────────────────────────────────

export async function executeBatch(ctx: BatchContext): Promise<void> {
  const {
    members, selectedTemplate, organisationId, projectId, apiBase,
    getEffectiveParams, getInputAssetsForMember,
    setJobStatuses, setCurrentIndex, abortRef,
  } = ctx;

  // Initialize all as pending
  const initial: Record<string, MemberJobStatus> = {};
  members.forEach((m) => { initial[m.id] = { status: 'pending' }; });
  setJobStatuses(initial);

  for (let i = 0; i < members.length; i++) {
    if (abortRef.current) break;

    const member = members[i];
    setCurrentIndex(i);
    setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'running' } }));

    const params = getEffectiveParams(member.id);
    const inputAssets = getInputAssetsForMember(member, params);

    // ── Video templates: try processing existing raw variant first ──
    const isVideoCategory = selectedTemplate.category === 'intro' || selectedTemplate.category === 'celebration';
    if (isVideoCategory) {
      const handled = await tryProcessExistingVariant(
        member, selectedTemplate, projectId, apiBase, abortRef, setJobStatuses,
      );
      if (handled) continue;
    }

    // ── Skip if no person input ──
    if (!inputAssets.person) {
      const needsFullbody = selectedTemplate.category === 'closeup' || selectedTemplate.outputType === 'video';
      setJobStatuses((prev) => ({
        ...prev,
        [member.id]: { status: 'skipped', error: needsFullbody ? 'Geen fullbody in tenue gevonden' : 'Geen profielfoto' },
      }));
      continue;
    }

    // ── AI Generation ──
    try {
      await generateForMember(
        member, params, inputAssets, selectedTemplate,
        organisationId, projectId, apiBase, abortRef, setJobStatuses,
      );
    } catch (err) {
      logger.error(`Batch generation failed for ${member.name}`, err);
      setJobStatuses((prev) => ({
        ...prev,
        [member.id]: { status: 'error', error: err instanceof Error ? err.message : 'Onbekende fout' },
      }));
    }
  }
}

// ── Try processing an existing raw video variant ─────────────────────

async function tryProcessExistingVariant(
  member: BatchMember,
  selectedTemplate: AssetTemplate,
  projectId: string,
  apiBase: string,
  abortRef: React.MutableRefObject<boolean>,
  setJobStatuses: SetJobStatuses,
): Promise<boolean> {
  const tr = (member.metadata?.teamreel_assets || {}) as Record<string, unknown>;
  const videoCategory = ((tr.videos || {}) as Record<string, unknown>)[selectedTemplate.category] || {};

  let existingVariant: { key: string; rawUrl: string } | null = null;
  for (const [key, val] of Object.entries(videoCategory as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const v = val as Record<string, unknown>;
    const state = (v.processing_state as string) || 'raw';
    if (v.raw && state !== 'processed' && state !== 'processing') {
      existingVariant = { key, rawUrl: v.raw as string };
      break;
    }
  }

  if (!existingVariant) return false;

  setJobStatuses((prev) => ({
    ...prev,
    [member.id]: { status: 'running', error: `Bestaande ${existingVariant!.key} verwerken…` },
  }));

  try {
    const procJson = await api.post<ProcessVariantsResponse>('/video/jobs/process-all-variants/', {
      membership_id: member.id, asset_type: selectedTemplate.category,
    });

    if (procJson.status === 'nothing_to_process') {
      setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'success', error: 'Al verwerkt' } }));
    } else {
      await pollVariantProcessing(member, selectedTemplate, projectId, apiBase, abortRef, setJobStatuses, procJson.total_queued || 0);
    }
  } catch (err) {
    logger.error(`Batch processing existing variant failed for ${member.name}`, err);
    setJobStatuses((prev) => ({
      ...prev,
      [member.id]: { status: 'error', error: err instanceof Error ? err.message : 'Onbekende fout' },
    }));
  }

  return true; // handled (even if failed)
}

// ── Poll until all video variants finish processing ──────────────────

async function pollVariantProcessing(
  member: BatchMember,
  selectedTemplate: AssetTemplate,
  projectId: string,
  apiBase: string,
  abortRef: React.MutableRefObject<boolean>,
  setJobStatuses: SetJobStatuses,
  totalQueued: number,
): Promise<void> {
  setJobStatuses((prev) => ({
    ...prev,
    [member.id]: { status: 'running', error: `${totalQueued} variant(en) bezig…` },
  }));

  const POLL_INTERVAL = 5000;
  const MAX_POLLS = 360;
  let allDone = false;

  for (let p = 0; p < MAX_POLLS; p++) {
    if (abortRef.current) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    if (abortRef.current) break;

    const mData = await api.get<MemberDetailResponse>(
      `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}/`,
    ).catch(() => null);
    if (!mData) continue;

    const mMeta = mData?.metadata || {};
    const trPoll = ((mMeta && ((mMeta as Record<string, unknown>).teamreel_assets || (mMeta as Record<string, unknown>).teamreelAssets)) || {}) as Record<string, unknown>;
    const videoCategoryPoll = ((trPoll.videos || {}) as Record<string, unknown>)[selectedTemplate.category] || {};

    let stillProcessing = 0;
    let processed = 0;
    let failed = 0;

    for (const [, pollVal] of Object.entries(videoCategoryPoll as Record<string, unknown>)) {
      if (!pollVal || typeof pollVal !== 'object') continue;
      const pollState = (pollVal as Record<string, unknown>).processing_state || 'raw';
      if (pollState === 'processing' || pollState === 'cancelling') stillProcessing++;
      else if (pollState === 'processed') processed++;
      else if (pollState === 'failed') failed++;
    }

    setJobStatuses((prev) => ({
      ...prev,
      [member.id]: {
        status: 'running',
        error: `${processed} voltooid, ${stillProcessing} bezig${failed > 0 ? `, ${failed} mislukt` : ''}`,
      },
    }));

    if (stillProcessing === 0 && (processed > 0 || failed > 0)) {
      allDone = true;
      setJobStatuses((prev) => ({
        ...prev,
        [member.id]: {
          status: failed > 0 ? 'error' : 'success',
          error: `${processed} voltooid${failed > 0 ? `, ${failed} mislukt` : ''}`,
        },
      }));
      break;
    }
  }

  if (!allDone && !abortRef.current) throw new Error('Processing timeout');
}

// ── Generate a single member asset via AI ────────────────────────────

async function generateForMember(
  member: BatchMember,
  params: MemberParams,
  inputAssets: Record<string, string | null>,
  selectedTemplate: AssetTemplate,
  organisationId: string,
  projectId: string,
  apiBase: string,
  abortRef: React.MutableRefObject<boolean>,
  setJobStatuses: SetJobStatuses,
): Promise<void> {
  // Build input URLs — map frontend keys to backend format
  const inputImageUrls: Record<string, string> = {};
  const isValidUrl = (url: string): boolean => {
    try { new URL(url); return true; } catch { return false; }
  };

  for (const [key, val] of Object.entries(inputAssets)) {
    if (!val) continue;
    let safeVal = val;
    if (!isValidUrl(safeVal)) safeVal = encodeURI(safeVal);
    if (!isValidUrl(safeVal)) { logger.warn(`Batch: skipping invalid URL for ${key}:`, val); continue; }

    if (key === 'person') inputImageUrls['person_photo'] = safeVal;
    else if (key === 'reference') inputImageUrls['reference_photo'] = safeVal;
    else inputImageUrls[key] = safeVal;
  }

  const responseData = await api.post<GenerateResponse>('/generative/assets/generate/', {
    template_id: selectedTemplate.id,
    params,
    variant_count: 1,
    input_images: {},
    input_image_urls: inputImageUrls,
    organisation_id: organisationId,
    project_id: projectId,
    membership_id: member.id,
    asset_type: selectedTemplate.outputAssetType,
    ...(selectedTemplate.outputType !== 'video' ? { save_to_brand: false, save_to_media_library: false } : {}),
  });

  const isImageTemplate = selectedTemplate.outputType !== 'video';
  const routedToApproval = isImageTemplate;

  // Async generation (was HTTP 202) — check for task_id
  if (responseData.task_id) {
    const taskId = responseData.task_id;

    if (routedToApproval) {
      setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'success', error: '→ Approvals wachtrij' } }));
      return;
    }

    // Video: poll for completion
    setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'running', error: 'Video wordt gegenereerd…' } }));

    const POLL_INTERVAL = 5_000;
    const MAX_POLLS = 150;
    let pollResult: Record<string, unknown> | null = null;

    for (let p = 0; p < MAX_POLLS; p++) {
      if (abortRef.current) break;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      if (abortRef.current) break;

      try {
        const statusData = await api.get<GenerateStatusResponse>(`/generative/assets/generate/${taskId}/status/`);
        if (statusData.status === 'completed') { pollResult = statusData.data || {}; break; }
        if (statusData.status === 'failed') throw new Error(statusData.error || 'Video generatie mislukt');
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 404) throw new Error('Taak verlopen');
          throw new Error(`Status check failed: HTTP ${e.status}`);
        }
        throw e;
      }
      // retrying: keep polling
    }

    if (!pollResult) throw new Error('Video generatie timeout');
    handleGenerationResult(pollResult, member, params, selectedTemplate, organisationId, projectId, apiBase, abortRef, setJobStatuses);
    return;
  }

  // Synchronous generation (was HTTP 200)
  handleGenerationResult(responseData, member, params, selectedTemplate, organisationId, projectId, apiBase, abortRef, setJobStatuses);
}

// ── Handle result from generation (sync or async) ────────────────────────────

async function handleGenerationResult(
  responseData: Record<string, unknown>,
  member: BatchMember,
  params: MemberParams,
  selectedTemplate: AssetTemplate,
  organisationId: string,
  projectId: string,
  apiBase: string,
  abortRef: React.MutableRefObject<boolean>,
  setJobStatuses: SetJobStatuses,
): Promise<void> {
  const variants = (responseData.variants || []) as Record<string, unknown>[];
  const variant = variants[0] as GenerationVariant | undefined;
  if (!variant || variant.error) throw new Error(variant?.error || 'No variant returned');

  // Auto-save the variant
  const storagePath = variant.storage_path || variant.storage_info?.storage_path;
  const resultUrl = variant.presigned_url || variant.video_url || storagePath;

  if (storagePath || variant.image_base64 || variant.video_url) {
    const isVideo = selectedTemplate.outputType === 'video' ||
      variant.mime_type?.startsWith('video/') || !!variant.video_url;

    const saveData = await api.post<SaveAssetResponse>('/generative/assets/save/', {
      storage_path: storagePath,
      presigned_url: variant.presigned_url,
      video_url: variant.video_url,
      image_base64: variant.image_base64,
      filename: variant.filename,
      mime_type: variant.mime_type || (isVideo ? 'video/mp4' : 'image/png'),
      file_size_bytes: variant.storage_info?.file_size_bytes || 0,
      organisation_id: organisationId,
      project_id: projectId,
      asset_type: selectedTemplate.outputAssetType,
    }).catch(() => null);

    const savedPath = saveData?.storage_path || storagePath;

    await updateMembershipMetadata(
      member, params, savedPath || resultUrl || '',
      selectedTemplate, projectId, apiBase,
    );
  }

  setJobStatuses((prev) => ({
    ...prev,
    [member.id]: { status: 'success', resultUrl: resultUrl || '' },
  }));
}

// ── Update membership metadata after generation ──────────────────────

export async function updateMembershipMetadata(
  member: BatchMember,
  params: MemberParams,
  savedUrl: string,
  selectedTemplate: AssetTemplate,
  projectId: string,
  apiBase: string,
): Promise<void> {
  if (!savedUrl) return;

  const kitType = params.kit_type || 'home';
  const styleVariant = params.style_variant;
  const category = selectedTemplate.category;

  let metaKey: string;
  let mediaSlotId: string;

  if (category === 'fullbody') {
    metaKey = kitType; mediaSlotId = 'kit';
  } else if (category === 'closeup') {
    metaKey = kitType; mediaSlotId = 'closeup';
  } else if (category === 'intro') {
    metaKey = styleVariant ? `${kitType}_${styleVariant}` : kitType; mediaSlotId = 'intro';
  } else if (category === 'celebration') {
    metaKey = styleVariant ? `${kitType}_${styleVariant}` : kitType; mediaSlotId = 'celebration';
  } else {
    return;
  }

  try {
    const existingMeta = member.metadata || {};
    const tr = ((existingMeta as Record<string, unknown>).teamreel_assets || {}) as Record<string, unknown>;
    const media = (tr.media || {}) as Record<string, Record<string, unknown>>;

    const updatedTr = { ...tr };
    updatedTr.media = { ...media, [mediaSlotId]: { ...(media[mediaSlotId] || {}), url: savedUrl } };

    if (category === 'fullbody' || category === 'closeup') {
      const images = (updatedTr.images || {}) as Record<string, Record<string, unknown>>;
      const subcat = images[category] || {};
      updatedTr.images = {
        ...images,
        [category]: { ...subcat, [metaKey]: { raw: savedUrl, processed: null, processing_state: 'raw' } },
      };
    } else {
      const videos = (updatedTr.videos || {}) as Record<string, Record<string, unknown>>;
      const subcat = videos[category] || {};
      updatedTr.videos = {
        ...videos,
        [category]: { ...subcat, [metaKey]: { raw: savedUrl, processed: null, processing_state: 'raw' } },
      };
    }

    const updatedMeta = { ...existingMeta, teamreel_assets: updatedTr };

    const res = await api.patch<MemberPatchResponse>(
      `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}/`,
      { metadata: updatedMeta },
    );
  } catch (err) {
    logger.error(`Error updating metadata for ${member.name}`, err);
  }
}
