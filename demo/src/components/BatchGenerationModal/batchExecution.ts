/**
 * batchExecution — pure async functions for batch AI generation.
 *
 * Separated from the hook so the 370-line startBatch logic can live
 * independently and be tested without React.
 */
import type { AssetTemplate } from '../../constants/assetTemplates';
import { getCsrfToken } from '../../utils/csrf';
import type { BatchMember, MemberParams, MemberJobStatus } from './batchTypes';

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
      console.error(err);
      console.error(`Batch generation failed for ${member.name}:`, err);
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
  const tr = member.metadata?.teamreel_assets || {};
  const videoCategory = (tr.videos || {})[selectedTemplate.category] || {};

  let existingVariant: { key: string; rawUrl: string } | null = null;
  for (const [key, val] of Object.entries(videoCategory)) {
    if (!val || typeof val !== 'object') continue;
    const v = val as Record<string, any>;
    const state = v.processing_state || 'raw';
    if (v.raw && state !== 'processed' && state !== 'processing') {
      existingVariant = { key, rawUrl: v.raw };
      break;
    }
  }

  if (!existingVariant) return false;

  setJobStatuses((prev) => ({
    ...prev,
    [member.id]: { status: 'running', error: `Bestaande ${existingVariant!.key} verwerken…` },
  }));

  try {
    const procRes = await fetch(`${apiBase}/api/v1/video/jobs/process-all-variants/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      body: JSON.stringify({ membership_id: member.id, asset_type: selectedTemplate.category }),
    });

    const procJson = await procRes.json().catch(() => ({}));
    if (!procRes.ok) throw new Error(procJson?.error || `Process failed (${procRes.status})`);

    if (procJson.status === 'nothing_to_process') {
      setJobStatuses((prev) => ({ ...prev, [member.id]: { status: 'success', error: 'Al verwerkt' } }));
    } else {
      await pollVariantProcessing(member, selectedTemplate, projectId, apiBase, abortRef, setJobStatuses, procJson.total_queued || 0);
    }
  } catch (err) {
    console.error(err);
    console.error(`Batch processing existing variant failed for ${member.name}:`, err);
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

    const mRes = await fetch(
      `${apiBase}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}/`,
      { credentials: 'include' },
    );
    if (!mRes.ok) continue;

    const mJson = await mRes.json().catch(() => null);
    const mData = mJson?.data || mJson;
    const mMeta = mData?.metadata || {};
    const trPoll = (mMeta && (mMeta.teamreel_assets || mMeta.teamreelAssets)) || {};
    const videoCategoryPoll = (trPoll.videos || {})[selectedTemplate.category] || {};

    let stillProcessing = 0;
    let processed = 0;
    let failed = 0;

    for (const [, pollVal] of Object.entries(videoCategoryPoll)) {
      if (!pollVal || typeof pollVal !== 'object') continue;
      const pollState = (pollVal as Record<string, any>).processing_state || 'raw';
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
    if (!isValidUrl(safeVal)) { console.warn(`Batch: skipping invalid URL for ${key}:`, val); continue; }

    if (key === 'person') inputImageUrls['person_photo'] = safeVal;
    else if (key === 'reference') inputImageUrls['reference_photo'] = safeVal;
    else inputImageUrls[key] = safeVal;
  }

  const res = await fetch(`${apiBase}/api/v1/generative/assets/generate/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    body: JSON.stringify({
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
    }),
  });

  let responseData: Record<string, unknown>;
  const isImageTemplate = selectedTemplate.outputType !== 'video';
  const routedToApproval = isImageTemplate;

  if (res.status === 202) {
    const asyncJson = await res.json();
    const asyncData = asyncJson.data || asyncJson;
    const taskId = asyncData.task_id;
    if (!taskId) throw new Error('Backend returned 202 but no task_id');

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

      const statusRes = await fetch(`${apiBase}/api/v1/generative/assets/generate/${taskId}/status/`, { credentials: 'include' });
      if (!statusRes.ok) {
        if (statusRes.status === 404) throw new Error('Taak verlopen');
        throw new Error(`Status check failed: HTTP ${statusRes.status}`);
      }

      const statusJson = await statusRes.json();
      const statusData = statusJson.data || statusJson;
      if (statusData.status === 'completed') { pollResult = statusData.data || {}; break; }
      if (statusData.status === 'failed') throw new Error(statusData.error || 'Video generatie mislukt');
      // retrying: keep polling — backend will re-dispatch the task automatically
    }

    if (!pollResult) throw new Error('Video generatie timeout');
    responseData = pollResult;
  } else if (res.ok) {
    const json = await res.json();
    responseData = json.data || json;
  } else {
    const errJson = await res.json().catch(() => ({}));
    const errField = (errJson as Record<string, unknown>)?.error;
    const errMessage =
      typeof errField === 'string' ? errField :
      typeof errField === 'object' && errField ? (errField as Record<string, string>)?.message || JSON.stringify(errField) :
      (errJson as Record<string, string>)?.detail || `HTTP ${res.status}`;
    throw new Error(errMessage);
  }

  const variants = (responseData.variants || []) as Record<string, unknown>[];
  const variant = variants[0] as any;
  if (!variant || variant.error) throw new Error(variant?.error || 'No variant returned');

  // Auto-save the variant
  const storagePath = variant.storage_path || variant.storage_info?.storage_path;
  const resultUrl = variant.presigned_url || variant.video_url || storagePath;

  if (storagePath || variant.image_base64 || variant.video_url) {
    const isVideo = selectedTemplate.outputType === 'video' ||
      variant.mime_type?.startsWith('video/') || !!variant.video_url;

    const saveRes = await fetch(`${apiBase}/api/v1/generative/assets/save/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
      body: JSON.stringify({
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
      }),
    });

    const saveJson = saveRes.ok ? await saveRes.json() : null;
    const saveData = saveJson?.data?.data || saveJson?.data || saveJson;
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
    const tr = existingMeta.teamreel_assets || {};
    const media = tr.media || {};

    const updatedTr = { ...tr };
    updatedTr.media = { ...media, [mediaSlotId]: { ...(media[mediaSlotId] || {}), url: savedUrl } };

    if (category === 'fullbody' || category === 'closeup') {
      const images = updatedTr.images || {};
      const subcat = images[category] || {};
      updatedTr.images = {
        ...images,
        [category]: { ...subcat, [metaKey]: { raw: savedUrl, processed: null, processing_state: 'raw' } },
      };
    } else {
      const videos = updatedTr.videos || {};
      const subcat = videos[category] || {};
      updatedTr.videos = {
        ...videos,
        [category]: { ...subcat, [metaKey]: { raw: savedUrl, processed: null, processing_state: 'raw' } },
      };
    }

    const updatedMeta = { ...existingMeta, teamreel_assets: updatedTr };

    const res = await fetch(
      `${apiBase}/api/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(member.id)}/`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({ metadata: updatedMeta }),
      },
    );

    if (!res.ok) {
      console.error(`Failed to update metadata for ${member.name}:`, await res.text());
    }
  } catch (err) {
    console.error(err);
    console.error(`Error updating metadata for ${member.name}:`, err);
  }
}
