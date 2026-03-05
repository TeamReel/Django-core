import React from 'react';
import { Badge, Card } from '@django-core/design-system';
import type { MemberTabCommonProps } from './memberDetailUtils';
import s from './ProjectSeasonMemberDetailPage.module.css';

export interface MemberOverviewTabProps extends MemberTabCommonProps {
  navigateToTab: (tab: string) => void;
}

export function MemberOverviewTab({
  form,
  videoVariants,
  userCanEditProject,
  navigateToTab,
}: MemberOverviewTabProps) {
  const hasVariantContent = (v: unknown): boolean => {
    if (!v) return false;
    if (typeof v === 'string') return true;
    if (typeof v === 'object' && v !== null) {
      const obj = v as Record<string, unknown>;
      return Boolean(obj.raw || obj.processed);
    }
    return false;
  };

  const hasLegacyFullbody = hasVariantContent(videoVariants.fullbody?.legacy);

  const inputItems = [
    { key: 'profile', icon: 'user', label: 'Profielfoto', tab: 'input', hasContent: Boolean(form.profile?.url) },
    { key: 'legacy_photo', icon: 'camera', label: 'Legacy Foto', tab: 'input', hasContent: Boolean(form.legacy_photo?.url) },
  ];
  const assetItems = [
    { key: 'kit', icon: 'shirt', label: 'In Tenue', tab: 'assets', hasContent: Boolean(form.kit?.url) },
    { key: 'closeup', icon: 'scan-face', label: 'Close-up', tab: 'assets', hasContent: Boolean(form.closeup?.url) },
    { key: 'legacy', icon: 'trophy', label: 'Legacy in Tenue', tab: 'assets', hasContent: Boolean(form.legacy?.url) || hasLegacyFullbody },
  ];

  const hasAnyIntro = Object.values(videoVariants.intro || {}).some(hasVariantContent);
  const hasAnyCelebration = Object.values(videoVariants.celebration || {}).some(hasVariantContent);
  const hasAnyThenVsNow = Object.values(videoVariants.then_vs_now || {}).some(hasVariantContent);
  const hasAnyDuoPortret = Object.values(videoVariants.photo_composite || {}).some(hasVariantContent);
  const hasAnyWalking = Object.values(videoVariants.walking_composite || {}).some(hasVariantContent);
  const hasAnyActionPhoto = Object.values(videoVariants.action_photo || {}).some(hasVariantContent);

  const videoItems = [
    { key: 'intro', icon: 'clapperboard', label: 'Short Intro', tab: 'intro', hasContent: hasAnyIntro },
    { key: 'celebration', icon: 'party-popper', label: 'Celebration', tab: 'celebration', hasContent: hasAnyCelebration },
    { key: 'then_vs_now', icon: 'clock', label: 'Transformation', tab: 'then_vs_now', hasContent: hasAnyThenVsNow },
    { key: 'duo_portret', icon: 'users', label: 'Duo Portret', tab: 'photo_composite', hasContent: hasAnyDuoPortret },
    { key: 'walking', icon: 'footprints', label: 'Walking Composite', tab: 'walking_composite', hasContent: hasAnyWalking },
    { key: 'action_photo', icon: 'zap', label: 'Actiefoto', tab: 'action_photo', hasContent: hasAnyActionPhoto },
  ];

  const allItems = [...inputItems, ...assetItems, ...videoItems];
  const completedCount = allItems.filter(i => i.hasContent).length;
  const totalCount = allItems.length;

  const renderPhase = (title: string, emoji: string, items: typeof inputItems) => (
    <div style={{ marginBottom: '20px' }}>
      <div className={`${s.flexCenterGap8}`} style={{ marginBottom: '10px' }}>
        <span className="fs-18">{emoji}</span>
        <div className={s.sectionTitle}>{title}</div>
        <div className="fs-12" style={{ opacity: 0.6 }}>
          {items.filter(i => i.hasContent).length}/{items.length}
        </div>
      </div>
      <div className={s.overviewGrid}>
        {items.map(item => (
          <div
            key={item.key}
            onClick={() => navigateToTab(item.tab)}
            className="p-12 rounded-8 cursor-pointer transition"
            style={{
              border: `1px solid ${item.hasContent ? 'var(--color-green-400)' : 'var(--app-border)'}`,
              background: item.hasContent ? 'rgba(16, 185, 129, 0.08)' : 'var(--app-surface)',
            }}
          >
            <div className={s.flexCenterGap8}>
              <span className="fs-18">{item.icon}</span>
              <span className="fw-600 fs-13">{item.label}</span>
              <span className="ml-auto fs-13">
                {item.hasContent ? '✅' : '⬜'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.tabTitle}>Overzicht</div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          Status per fase: welke assets zijn geüpload of gegenereerd.
        </div>

        <div className="mt-16">
          {renderPhase('📥 Input Foto\'s', '📥', inputItems)}
          {renderPhase('🖼️ Gegenereerde Assets', '🖼️', assetItems)}
          {renderPhase('🎬 Video Content', '🎬', videoItems)}
        </div>

        <div className={s.progressBar}>
          <div className="fs-13 fw-600">
            Voortgang: {completedCount} / {totalCount} assets
          </div>
          <div className="mt-8 rounded-4 overflow-hidden" style={{ height: '8px', background: '#e5e7eb' }}>
            <div
              style={{
                height: '100%',
                width: `${(completedCount / totalCount) * 100}%`,
                background: completedCount === totalCount ? 'var(--color-green-400)' : 'var(--color-blue-500)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
