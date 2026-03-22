/**
 * AssetDetailSheet — Preview + manage a specific brand asset from the Overview tab.
 *
 * Opens as a NavigationSheet (sliding panel). Shows the current state of the
 * asset with preview images and a CTA to open the full asset editor.
 */
import React, { useCallback, useMemo } from 'react';
import { Shirt, Building2, Camera, Image, Users } from 'lucide-react';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import { AppIcon } from '../../components/AppIcon';
import type { SquadMember } from '../periods/squadTabTypes';
import s from './AssetDetailSheet.module.css';

/* ── Types ────────────────────────────────────────────────────────────── */

export type AssetSheetType =
  | 'tenue'
  | 'sponsor'
  | 'member-photos'
  | 'logo'
  | 'club-sponsor'
  | 'kits';

interface AssetDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: AssetSheetType | null;
  /** Brand kits: { home, away, third, goalkeeper } URLs */
  batchBrandKits: Record<string, string | null>;
  /** Club logo URL */
  logoUrl: string | null;
  /** Club sponsor URL */
  sponsorUrl: string | null;
  /** Member photo summary */
  memberSummary: { complete: number; total: number };
  /** Squad members for member-photos view */
  members?: SquadMember[];
  /** Navigate to a specific tab for full editing */
  onNavigateToTab: (tab: string) => void;
}

/* ── Config per type ──────────────────────────────────────────────────── */

const SHEET_CONFIG: Record<AssetSheetType, {
  title: string;
  icon: typeof Shirt;
  editTab: string;
  editLabel: string;
}> = {
  tenue: { title: 'Tenue', icon: Shirt, editTab: 'assets', editLabel: 'Beheer tenue' },
  sponsor: { title: 'Sponsor', icon: Image, editTab: 'assets', editLabel: 'Beheer sponsor' },
  'member-photos': { title: "Ledenfoto's", icon: Camera, editTab: 'beheer', editLabel: "Beheer foto's" },
  logo: { title: 'Club logo', icon: Building2, editTab: 'club', editLabel: 'Beheer logo' },
  'club-sponsor': { title: 'Club sponsor', icon: Image, editTab: 'club', editLabel: 'Beheer sponsor' },
  kits: { title: 'Club kits', icon: Shirt, editTab: 'club', editLabel: 'Beheer kits' },
};

const KIT_LABELS: Record<string, string> = {
  home: 'Thuis',
  away: 'Uit',
  third: 'Derde',
  goalkeeper: 'Keeper',
};

/* ── Component ────────────────────────────────────────────────────────── */

export const AssetDetailSheet: React.FC<AssetDetailSheetProps> = ({
  isOpen,
  onClose,
  type,
  batchBrandKits,
  logoUrl,
  sponsorUrl,
  memberSummary,
  members,
  onNavigateToTab,
}) => {
  const config = type ? SHEET_CONFIG[type] : null;

  const handleEdit = useCallback(() => {
    if (!config) return;
    onClose();
    onNavigateToTab(config.editTab);
  }, [config, onClose, onNavigateToTab]);

  /* Kit entries for grid display */
  const kitEntries = useMemo(() => {
    if (!batchBrandKits) return [];
    return Object.entries(batchBrandKits)
      .filter(([key]) => KIT_LABELS[key])
      .map(([key, url]) => ({ key, label: KIT_LABELS[key], url }));
  }, [batchBrandKits]);

  /* Member photo list (first 20 for preview) */
  const memberPreview = useMemo(() => {
    if (!members) return [];
    return members.slice(0, 20).map((m) => {
      const avatarUrl = (m.user as Record<string, unknown> | undefined)?.avatar_url as string | undefined;
      const name = m.user?.first_name || m.user?.name || 'Lid';
      const hasPhoto = Boolean(avatarUrl);
      return { id: String(m.id), name: String(name), avatarUrl, hasPhoto };
    });
  }, [members]);

  if (!type || !config) return null;

  return (
    <NavigationSheet
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      icon={<AppIcon icon={config.icon} size={20} />}
      footer={
        <button type="button" className={s.editButton} onClick={handleEdit}>
          {config.editLabel}
        </button>
      }
    >
      <div className={s.root}>
        {/* ── Tenue: kit preview grid ── */}
        {type === 'tenue' && (
          <div className={s.section}>
            <p className={s.sectionLabel}>Team kits</p>
            <div className={s.kitGrid}>
              {kitEntries.map(({ key, label, url }) => (
                <div key={key} className={s.kitCard}>
                  {url ? (
                    <img src={url} alt={label} className={s.kitImage} loading="lazy" />
                  ) : (
                    <div className={s.kitPlaceholder}>
                      <AppIcon icon={Shirt} size={24} />
                    </div>
                  )}
                  <span className={s.kitLabel}>{label}</span>
                  <span className={s.kitStatus}>{url ? '\u2713' : '\u2013'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Sponsor: single image preview ── */}
        {type === 'sponsor' && (
          <div className={s.section}>
            <p className={s.sectionLabel}>Sponsor logo</p>
            {sponsorUrl ? (
              <div className={s.previewWrap}>
                <img src={sponsorUrl} alt="Sponsor" className={s.previewImage} loading="lazy" />
              </div>
            ) : (
              <div className={s.emptyState}>
                <AppIcon icon={Image} size={32} className={s.emptyIcon} />
                <p className={s.emptyText}>Geen sponsor logo ingesteld</p>
              </div>
            )}
          </div>
        )}

        {/* ── Logo: single image preview ── */}
        {type === 'logo' && (
          <div className={s.section}>
            <p className={s.sectionLabel}>Club logo</p>
            {logoUrl ? (
              <div className={s.previewWrap}>
                <img src={logoUrl} alt="Club logo" className={s.previewImage} loading="lazy" />
              </div>
            ) : (
              <div className={s.emptyState}>
                <AppIcon icon={Building2} size={32} className={s.emptyIcon} />
                <p className={s.emptyText}>Geen club logo ingesteld</p>
              </div>
            )}
          </div>
        )}

        {/* ── Club sponsor: single image preview ── */}
        {type === 'club-sponsor' && (
          <div className={s.section}>
            <p className={s.sectionLabel}>Club sponsor logo</p>
            {sponsorUrl ? (
              <div className={s.previewWrap}>
                <img src={sponsorUrl} alt="Club sponsor" className={s.previewImage} loading="lazy" />
              </div>
            ) : (
              <div className={s.emptyState}>
                <AppIcon icon={Image} size={32} className={s.emptyIcon} />
                <p className={s.emptyText}>Geen club sponsor ingesteld</p>
              </div>
            )}
          </div>
        )}

        {/* ── Club kits: same grid as tenue ── */}
        {type === 'kits' && (
          <div className={s.section}>
            <p className={s.sectionLabel}>Club kits</p>
            <div className={s.kitGrid}>
              {kitEntries.map(({ key, label, url }) => (
                <div key={key} className={s.kitCard}>
                  {url ? (
                    <img src={url} alt={label} className={s.kitImage} loading="lazy" />
                  ) : (
                    <div className={s.kitPlaceholder}>
                      <AppIcon icon={Shirt} size={24} />
                    </div>
                  )}
                  <span className={s.kitLabel}>{label}</span>
                  <span className={s.kitStatus}>{url ? '\u2713' : '\u2013'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Member photos: summary + mini-grid ── */}
        {type === 'member-photos' && (
          <div className={s.section}>
            <p className={s.sectionLabel}>
              Ledenfoto's ({memberSummary.complete}/{memberSummary.total})
            </p>
            <div className={s.memberGrid}>
              {memberPreview.map((m) => (
                <div
                  key={m.id}
                  className={s.memberThumb}
                  data-complete={m.hasPhoto ? 'true' : 'false'}
                >
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.name} className={s.memberImage} loading="lazy" />
                  ) : (
                    <div className={s.memberPlaceholder}>
                      <AppIcon icon={Users} size={16} />
                    </div>
                  )}
                  <span className={s.memberName}>{m.name}</span>
                </div>
              ))}
            </div>
            {(members?.length ?? 0) > 20 && (
              <p className={s.moreText}>
                +{(members?.length ?? 0) - 20} meer
              </p>
            )}
          </div>
        )}
      </div>
    </NavigationSheet>
  );
};
