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
    { key: 'profile', icon: '👤', label: 'Profielfoto', tab: 'input', hasContent: Boolean(form.profile?.url) },
    { key: 'legacy_photo', icon: '📸', label: 'Legacy Foto', tab: 'input', hasContent: Boolean(form.legacy_photo?.url) },
  ];
  const assetItems = [
    { key: 'kit', icon: '👕', label: 'In Tenue', tab: 'assets', hasContent: Boolean(form.kit?.url) },
    { key: 'closeup', icon: '🔍', label: 'Close-up', tab: 'assets', hasContent: Boolean(form.closeup?.url) },
    { key: 'legacy', icon: '🏆', label: 'Legacy in Tenue', tab: 'assets', hasContent: Boolean(form.legacy?.url) || hasLegacyFullbody },
  ];

  const hasAnyIntro = Object.values(videoVariants.intro || {}).some(hasVariantContent);
  const hasAnyCelebration = Object.values(videoVariants.celebration || {}).some(hasVariantContent);
  const hasAnyThenVsNow = Object.values(videoVariants.then_vs_now || {}).some(hasVariantContent);
  const hasAnyDuoPortret = Object.values(videoVariants.photo_composite || {}).some(hasVariantContent);
  const hasAnyWalking = Object.values(videoVariants.walking_composite || {}).some(hasVariantContent);
  const hasAnyActionPhoto = Object.values(videoVariants.action_photo || {}).some(hasVariantContent);

  const videoItems = [
    { key: 'intro', icon: '🎬', label: 'Short Intro', tab: 'intro', hasContent: hasAnyIntro },
    { key: 'celebration', icon: '🎉', label: 'Celebration', tab: 'celebration', hasContent: hasAnyCelebration },
    { key: 'then_vs_now', icon: '⏳', label: 'Transformation', tab: 'then_vs_now', hasContent: hasAnyThenVsNow },
    { key: 'duo_portret', icon: '👥', label: 'Duo Portret', tab: 'photo_composite', hasContent: hasAnyDuoPortret },
    { key: 'walking', icon: '🚶', label: 'Walking Composite', tab: 'walking_composite', hasContent: hasAnyWalking },
    { key: 'action_photo', icon: '⚡', label: 'Actiefoto', tab: 'action_photo', hasContent: hasAnyActionPhoto },
  ];

  const allItems = [...inputItems, ...assetItems, ...videoItems];
  const completedCount = allItems.filter(i => i.hasContent).length;
  const totalCount = allItems.length;

  const renderPhase = (title: string, emoji: string, items: typeof inputItems) => (
    <div style={{ marginBottom: '20px' }}>
      <div className={s.flexCenterGap8} style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <div className={s.sectionTitle}>{title}</div>
        <div style={{ fontSize: '12px', opacity: 0.6 }}>
          {items.filter(i => i.hasContent).length}/{items.length}
        </div>
      </div>
      <div className={s.overviewGrid}>
        {items.map(item => (
          <div
            key={item.key}
            onClick={() => navigateToTab(item.tab)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${item.hasContent ? '#10b981' : 'var(--app-border)'}`,
              background: item.hasContent ? 'rgba(16, 185, 129, 0.08)' : 'var(--app-surface)',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            <div className={s.flexCenterGap8}>
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '13px' }}>
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

        <div style={{ marginTop: '16px' }}>
          {renderPhase('📥 Input Foto\'s', '📥', inputItems)}
          {renderPhase('🖼️ Gegenereerde Assets', '🖼️', assetItems)}
          {renderPhase('🎬 Video Content', '🎬', videoItems)}
        </div>

        <div className={s.progressBar}>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            Voortgang: {completedCount} / {totalCount} assets
          </div>
          <div style={{ marginTop: '8px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(completedCount / totalCount) * 100}%`,
                background: completedCount === totalCount ? '#10b981' : '#3b82f6',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
