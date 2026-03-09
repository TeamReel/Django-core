/**
 * MemberAiModal — Wrapper for AssetGenerationModal with all the complex
 * prop configuration and onAssetSaved callback logic.
 *
 * Extracts: AI modal state, effectiveKits, openAiModal handler,
 * previousResultUrl computation, onAssetSaved asset routing.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { MemberMediaForm } from '../../constants/mediaSlots';
import { getBestUrl } from '../../constants/assetProcessingSpecs';
import { AssetGenerationModal } from '../../components/AssetGenerationModal';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { mergeAssetsIntoMetadata } from './memberDetailUtils';
import type { AssetVariantsMap } from './memberDetailUtils';

export interface MemberAiModalProps {
  // Entity identifiers
  membershipId: string;
  membership: any | null;
  project: { id: string; [k: string]: any } | null;
  org: { id: string; [k: string]: any } | null;
  club: { id: string; [k: string]: any } | null;
  isTeamRoute: boolean;
  apiBaseUrl: string;

  // Brand
  clubBrand: any;
  teamBrand: any;
  batchBrandKits: Record<string, string | null>;

  // Media state
  form: MemberMediaForm;
  setForm: React.Dispatch<React.SetStateAction<MemberMediaForm>>;
  videoVariants: AssetVariantsMap;
  setVideoVariants: React.Dispatch<React.SetStateAction<AssetVariantsMap>>;
  resolveDisplayUrl: (path: string | null | undefined) => string | null;
  setPresignedCache: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleMetadataUpdate: (meta: Record<string, unknown>, targetId?: string) => Promise<void>;
  setMembership: React.Dispatch<React.SetStateAction<any | null>>;
}

/** Imperative handle so the parent can call openAiModal */
export interface MemberAiModalHandle {
  open: (templateId: string, defaultKitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null, referenceOverride?: string | null) => void;
}

const KIT_ROLE_META = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'away', label: 'Away', icon: 'plane' },
  { id: 'third', label: 'Third', icon: 'hash' },
  { id: 'goalkeeper', label: 'Keeper', icon: 'shield' },
];

export function MemberAiModal({
  membershipId, membership, project, org, club, isTeamRoute, apiBaseUrl,
  clubBrand, teamBrand, batchBrandKits,
  form, setForm, videoVariants, setVideoVariants,
  resolveDisplayUrl, setPresignedCache, handleMetadataUpdate, setMembership,
  aiModalRef,
}: MemberAiModalProps & { aiModalRef: React.MutableRefObject<MemberAiModalHandle | null> }) {
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPreselectedTemplate, setAiPreselectedTemplate] = useState<string | undefined>();
  const [aiSelectedKitUrl, setAiSelectedKitUrl] = useState<string | null>(null);
  const [aiSelectedKitType, setAiSelectedKitType] = useState<string>('home');
  const [aiInputPersonUrl, setAiInputPersonUrl] = useState<string | null>(null);
  const [aiSelectedStyleVariant, setAiSelectedStyleVariant] = useState<string | null>(null);

  // Default kit type based on member role
  useEffect(() => {
    if (membership?.role) {
      if (membership.role === 'goalkeeper') setAiSelectedKitType('goalkeeper');
      else if (membership.role === 'coach') setAiSelectedKitType('coach');
      else if (membership.role === 'assistant') setAiSelectedKitType('assistant');
      else setAiSelectedKitType('home');
    }
  }, [membership?.role]);

  const effectiveKits = useMemo(() =>
    KIT_ROLE_META.map(role => ({ id: role.id, label: role.label, icon: role.icon, url: batchBrandKits[role.id] ?? null })),
    [batchBrandKits]
  );

  const openAiModal = useCallback((templateId: string, defaultKitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null, referenceOverride?: string | null) => {
    setAiPreselectedTemplate(templateId);
    const kitType = defaultKitType || 'home';
    setAiSelectedKitType(kitType);
    const kit = effectiveKits.find(k => k.id === kitType);
    setAiSelectedKitUrl(referenceOverride || kit?.url || null);
    setAiInputPersonUrl(playerInTenueUrl || null);
    setAiSelectedStyleVariant(styleVariant || null);
    setShowAiModal(true);
  }, [effectiveKits]);

  // Expose openAiModal to parent via ref
  React.useImperativeHandle(aiModalRef, () => ({ open: openAiModal }), [openAiModal]);

  const previousResultUrl = useMemo(() => {
    if (aiPreselectedTemplate === 'fullbody_in_tenue') return getBestUrl(videoVariants.fullbody[aiSelectedKitType]) || form.kit?.url || null;
    if (aiPreselectedTemplate === 'closeup_in_tenue') return getBestUrl(videoVariants.closeup[aiSelectedKitType]) || form.closeup?.url || null;
    if (aiPreselectedTemplate === 'member_intro' && aiSelectedStyleVariant) return getBestUrl(videoVariants.intro[`${aiSelectedKitType}_${aiSelectedStyleVariant}`]) || null;
    if (aiPreselectedTemplate === 'member_goal_celebration' && aiSelectedStyleVariant) return getBestUrl(videoVariants.celebration[`${aiSelectedKitType}_${aiSelectedStyleVariant}`]) || null;
    if (aiPreselectedTemplate === 'then_vs_now_sidebyside') return getBestUrl(videoVariants.then_vs_now.sidebyside) || null;
    if (aiPreselectedTemplate === 'then_vs_now_transformation' && aiSelectedStyleVariant) return getBestUrl(videoVariants.then_vs_now[`transformation_${aiSelectedStyleVariant}`]) || getBestUrl(videoVariants.then_vs_now.transformation) || null;
    if (aiPreselectedTemplate === 'then_vs_now_transformation') return getBestUrl(videoVariants.then_vs_now.transformation) || null;
    if (aiPreselectedTemplate === 'photo_composite_gemini') return getBestUrl(videoVariants.photo_composite?.home) || null;
    if (aiPreselectedTemplate === 'photo_composite_video') return getBestUrl(videoVariants.photo_composite?.default) || null;
    if (aiPreselectedTemplate === 'walking_composite_far') return getBestUrl(videoVariants.walking_composite?.far) || null;
    if (aiPreselectedTemplate === 'walking_composite_near') return getBestUrl(videoVariants.walking_composite?.near) || null;
    if (aiPreselectedTemplate === 'walking_composite_video') return getBestUrl(videoVariants.walking_composite?.default) || null;
    return null;
  }, [aiPreselectedTemplate, aiSelectedKitType, aiSelectedStyleVariant, videoVariants, form]);

  const inputAssets = useMemo(() => ({
    logo: (teamBrand.getAsset?.('logo_upload') || clubBrand.getAsset?.('logo_upload'))
      ? getAssetUrl((teamBrand.getAsset?.('logo_upload') || clubBrand.getAsset?.('logo_upload'))!.url)
      : null,
    sponsor: (teamBrand.getAsset?.('sponsor_logo_upload') || clubBrand.getAsset?.('sponsor_logo_upload'))
      ? getAssetUrl((teamBrand.getAsset?.('sponsor_logo_upload') || clubBrand.getAsset?.('sponsor_logo_upload'))!.url)
      : null,
    reference: aiSelectedKitUrl,
    person: aiInputPersonUrl
      ? getAssetUrl(aiInputPersonUrl)
      : aiSelectedKitType === 'legacy'
        ? resolveDisplayUrl(form.legacy_photo?.url) || resolveDisplayUrl(form.profile?.url) || membership?.user?.avatar_url || null
        : resolveDisplayUrl(form.profile?.url) || membership?.user?.avatar_url || null,
    background: (() => {
      const bgs = clubBrand.getAssets?.('club_background') || [];
      const bg = bgs[0] || clubBrand.getAsset?.('stadium_background');
      return bg ? getAssetUrl(bg.url) : null;
    })(),
  }), [aiInputPersonUrl, aiSelectedKitType, aiSelectedKitUrl, clubBrand, teamBrand, form, membership, resolveDisplayUrl]);

  const availableBackgrounds = useMemo(() => {
    const bgs: Array<{ url: string; label?: string }> = [];
    const clubBgs = clubBrand.getAssets?.('club_background') || [];
    clubBgs.forEach((bg: any, idx: number) => {
      if (bg?.url) { const r = getAssetUrl(bg.url); if (r) bgs.push({ url: r, label: bg.label || `Clubachtergrond ${idx + 1}` }); }
    });
    const stadiumBg = clubBrand.getAsset?.('stadium_background');
    if (stadiumBg?.url) { const r = getAssetUrl(stadiumBg.url); if (r) bgs.push({ url: r, label: 'Stadion' }); }
    return bgs;
  }, [clubBrand]);

  const handleAssetSaved = useCallback(async (savedInfo: any) => {
    const saveMembershipId = membershipId;
    if (!saveMembershipId) { console.error('onAssetSaved: no membershipId'); return; }
    setShowAiModal(false);

    if (!savedInfo?.storagePath && !savedInfo?.presignedUrl) return;

    const assetType = savedInfo.assetType;
    const savedUrl = savedInfo.storagePath || savedInfo.presignedUrl || '';

    if (savedInfo.storagePath && savedInfo.presignedUrl) {
      setPresignedCache(prev => ({ ...prev, [savedInfo.storagePath!]: savedInfo.presignedUrl! }));
    }

    const isFullbody = assetType.startsWith('member_in_tenue');
    const isCloseup = assetType.startsWith('member_closeup');
    const isIntroVideo = assetType.startsWith('member_intro');
    const isCelebrationVideo = assetType.startsWith('member_goal_celebration');
    const isThenVsNow = assetType.startsWith('then_vs_now');

    const kitTypeFromAsset =
      isFullbody ? assetType.replace('member_in_tenue_', '').replace('member_in_tenue', '') || aiSelectedKitType :
      isCloseup ? assetType.replace('member_closeup_', '').replace('member_closeup', '') || aiSelectedKitType :
      aiSelectedKitType;
    const effectiveKitType = kitTypeFromAsset || 'home';

    const refreshMembership = async () => {
      try {
        const memberRes = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(saveMembershipId)}/`, { credentials: 'include' });
        if (memberRes.ok) { const json = await memberRes.json(); setMembership(json?.data || json); }
      } catch { /* best-effort */ }
    };

    if (isFullbody || isCloseup) {
      const category = isFullbody ? 'fullbody' : 'closeup';
      const newVariants: AssetVariantsMap = { ...videoVariants, [category]: { ...videoVariants[category], [effectiveKitType]: savedUrl } };
      setVideoVariants(newVariants);
      const slotId: keyof MemberMediaForm = isFullbody ? 'kit' : 'closeup';
      const newForm = effectiveKitType === 'home' ? { ...form, [slotId]: { url: savedUrl, caption: '' } } : form;
      if (effectiveKitType === 'home') setForm(newForm);
      const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVariants);
      await handleMetadataUpdate(updatedMeta, saveMembershipId);
    } else if ((isIntroVideo || isCelebrationVideo) && aiSelectedStyleVariant) {
      const category = isIntroVideo ? 'intro' : 'celebration';
      const compositeKey = `${effectiveKitType}_${aiSelectedStyleVariant}`;
      const newVariants: AssetVariantsMap = { ...videoVariants, [category]: { ...videoVariants[category], [compositeKey]: savedUrl } };
      setVideoVariants(newVariants);
      const slotId = isIntroVideo ? 'intro' : 'celebration';
      const newForm = { ...form, [slotId]: { url: savedUrl, caption: '' } };
      setForm(newForm);
      const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVariants);
      await handleMetadataUpdate(updatedMeta, saveMembershipId);
    } else if (isThenVsNow) {
      let variantKey: string;
      if (assetType === 'then_vs_now_sidebyside') variantKey = 'sidebyside';
      else if (assetType === 'then_vs_now_transformation' && aiSelectedStyleVariant) variantKey = `transformation_${aiSelectedStyleVariant}`;
      else variantKey = assetType === 'then_vs_now_transformation' ? 'transformation' : assetType.replace('then_vs_now_', '');
      const newVariants: AssetVariantsMap = { ...videoVariants, then_vs_now: { ...videoVariants.then_vs_now, [variantKey]: savedUrl } };
      setVideoVariants(newVariants);
      const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVariants);
      await handleMetadataUpdate(updatedMeta, saveMembershipId);
    } else if (assetType.startsWith('photo_composite')) {
      const variantKey = assetType === 'photo_composite_gemini' ? 'home' : 'default';
      const newVariants: AssetVariantsMap = { ...videoVariants, photo_composite: { ...videoVariants.photo_composite, [variantKey]: savedUrl } };
      setVideoVariants(newVariants);
      await refreshMembership();
    } else if (assetType.startsWith('action_photo')) {
      const compositeKey = assetType.replace('action_photo_', '') || `${aiSelectedKitType || 'home'}_dribbling`;
      const newVariants: AssetVariantsMap = { ...videoVariants, action_photo: { ...videoVariants.action_photo, [compositeKey]: savedUrl } };
      setVideoVariants(newVariants);
      await refreshMembership();
    } else if (assetType.startsWith('walking_composite')) {
      const variantKey = assetType === 'walking_composite_far' ? 'far' : assetType === 'walking_composite_near' ? 'near' : 'default';
      const newVariants: AssetVariantsMap = { ...videoVariants, walking_composite: { ...videoVariants.walking_composite, [variantKey]: savedUrl } };
      setVideoVariants(newVariants);
      await refreshMembership();
    }
  }, [membershipId, aiSelectedKitType, aiSelectedStyleVariant, videoVariants, form, membership, project, apiBaseUrl, setVideoVariants, setForm, setPresignedCache, handleMetadataUpdate, setMembership]);

  if (!showAiModal) return null;

  return (
    <AssetGenerationModal
      isOpen={showAiModal}
      onClose={() => { setShowAiModal(false); setAiSelectedKitUrl(null); setAiInputPersonUrl(null); setAiSelectedStyleVariant(null); }}
      context="member"
      preSelectedTemplate={aiPreselectedTemplate}
      projectId={isTeamRoute ? String(project?.id || '') : String(club?.id || project?.id || '')}
      organisationId={String(org?.id || '')}
      membershipId={membershipId}
      requireApproval
      inputAssets={inputAssets}
      initialParams={{
        kit_type: aiSelectedKitType,
        ...(aiSelectedKitType === 'goalkeeper' ? { role: 'goalkeeper' } : {}),
        ...(aiSelectedKitType === 'coach' ? { role: 'coach' } : {}),
        ...(aiSelectedKitType === 'assistant' ? { role: 'assistant' } : {}),
        ...(aiSelectedStyleVariant ? { style_variant: aiSelectedStyleVariant } : {}),
      }}
      previousResultUrl={previousResultUrl}
      availableBackgrounds={availableBackgrounds}
      onAssetSaved={handleAssetSaved}
    />
  );
}

export { type AssetVariantsMap };
