import { useState, useCallback, useMemo } from 'react';
import { Alert, Badge, Card } from '@django-core/design-system';
import { ChevronDown } from 'lucide-react';
import { AssetsTab } from '../../components/AssetsTab';
import type { MemberTabCommonProps } from './memberDetailUtils';
import { getUserDisplayName } from './memberDetailUtils';
import { KitAssetSection } from './KitAssetSection';
import { LegacyAssetSection } from './LegacyAssetSection';
import s from './ProjectSeasonMemberDetailPage.module.css';
import m from './MemberAssetsTab.module.css';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export interface MemberAssetsTabProps extends MemberTabCommonProps {
  croppingCloseup: Record<string, boolean>;
  cropCloseupFromFullbody: (kitId: string) => void;
  croppingHalfbody: Record<string, boolean>;
  cropHalfbodyFromFullbody: (kitId: string) => void;
  org: { id?: string; slug?: string; name?: string } | null;
  club: { id?: string; slug?: string; name?: string } | null;
}

export function MemberAssetsTab({
  membership,
  form,
  setForm,
  videoVariants,
  setVideoVariants,
  userCanEditProject,
  apiBaseUrl,
  membershipId,
  resolveDisplayUrl,
  openAiModal,
  handleMetadataUpdate,
  startProcessingPoll,
  effectiveKits,
  croppingCloseup,
  cropCloseupFromFullbody,
  croppingHalfbody,
  cropHalfbodyFromFullbody,
  org,
  club,
  project,
  selectedRole,
}: MemberAssetsTabProps) {
  const confirm = useConfirm();

  // First kit expanded by default, rest collapsed on mobile
  const [expandedKits, setExpandedKits] = useState<Set<string>>(
    () => new Set(effectiveKits.length > 0 ? [effectiveKits[0].id] : []),
  );
  // Derived assets (halfbody + closeup) collapsed by default
  const [derivedExpanded, setDerivedExpanded] = useState<Set<string>>(new Set());
  const [inheritedOpen, setInheritedOpen] = useState(false);

  const toggleKit = useCallback((kitId: string) => {
    setExpandedKits((prev) => {
      const next = new Set(prev);
      if (next.has(kitId)) next.delete(kitId);
      else next.add(kitId);
      return next;
    });
  }, []);

  const toggleDerived = useCallback((kitId: string) => {
    setDerivedExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(kitId)) next.delete(kitId);
      else next.add(kitId);
      return next;
    });
  }, []);

  // Extract legacy photo URL from metadata
  const legacyPhotoUrl = useMemo(() => {
    const meta = membership?.metadata || {};
    const tr = meta?.teamreel_assets || meta?.teamreelAssets || {};
    if (tr.media?.legacy_photo?.url) return tr.media.legacy_photo.url as string;
    if (tr.old?.profile_photo_url && typeof tr.old.profile_photo_url === 'string') return tr.old.profile_photo_url;
    return null;
  }, [membership]);

  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <div className={s.tabTitle}>Gegenereerde Assets</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          AI-gegenereerde afbeeldingen van dit lid per tenue. Halfbody en close-up worden automatisch afgeleid.
        </div>

        {/* Per-Kit Sections */}
        {effectiveKits.map((kit) => (
          <KitAssetSection
            key={`assets-kit-${kit.id}`}
            kit={kit}
            expanded={expandedKits.has(kit.id)}
            derivedExpanded={derivedExpanded.has(kit.id)}
            onToggle={() => toggleKit(kit.id)}
            onToggleDerived={() => toggleDerived(kit.id)}
            videoVariants={videoVariants}
            form={form}
            setForm={setForm}
            setVideoVariants={setVideoVariants}
            userCanEditProject={userCanEditProject}
            apiBaseUrl={apiBaseUrl}
            membershipId={membershipId}
            resolveDisplayUrl={resolveDisplayUrl}
            openAiModal={openAiModal}
            handleMetadataUpdate={handleMetadataUpdate}
            startProcessingPoll={startProcessingPoll}
            membership={membership}
            croppingCloseup={croppingCloseup}
            cropCloseupFromFullbody={cropCloseupFromFullbody}
            croppingHalfbody={croppingHalfbody}
            cropHalfbodyFromFullbody={cropHalfbodyFromFullbody}
            selectedRole={selectedRole}
            confirm={confirm}
          />
        ))}

        {/* Legacy sections */}
        {legacyPhotoUrl && (
          <LegacyAssetSection
            legacyPhotoUrl={legacyPhotoUrl}
            videoVariants={videoVariants}
            form={form}
            setVideoVariants={setVideoVariants}
            apiBaseUrl={apiBaseUrl}
            membershipId={membershipId}
            resolveDisplayUrl={resolveDisplayUrl}
            openAiModal={openAiModal}
            handleMetadataUpdate={handleMetadataUpdate}
            startProcessingPoll={startProcessingPoll}
            membership={membership}
            selectedRole={selectedRole}
            confirm={confirm}
          />
        )}

        {/* Team/Club Assets Section */}
        <div className={`pt-24 border-top ${m.inheritedSection}`}>
          <button
            type="button"
            className={m.kitAccordionBtn}
            onClick={() => setInheritedOpen((prev) => !prev)}
            aria-expanded={inheritedOpen}
          >
            <h4 className="fs-14 fw-600">Geërfde Team Assets</h4>
            <ChevronDown
              size={16}
              className={m.kitChevron}
              data-open={inheritedOpen ? 'true' : undefined}
            />
          </button>
          {inheritedOpen && (
            <>
              <p className={`fs-12 mb-16 ${m.inheritedDescription}`}>
                Deze assets worden geërfd van het team/seizoen en worden gebruikt als basis voor generatie.
              </p>
              <AssetsTab
                level="member"
                organisationId={String(org?.id || '')}
                projectId={project?.id ? String(project.id) : undefined}
                parentProjectId={club?.id ? String(club.id) : undefined}
                entityName={getUserDisplayName(membership)}
                readOnly
              />
            </>
          )}
        </div>

        {!userCanEditProject && (
          <div className="mt-16">
            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
          </div>
        )}
      </div>
    </Card>
  );
}
