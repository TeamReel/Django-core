/**
 * IdentityTab — Shared brand identity display component
 *
 * Used across Club, Team, Season, Match, and Member detail pages.
 * Shows logo, kits, sponsor with inheritance indicators.
 *
 * Hierarchy:
 * - Club: Upload logo, kits, sponsor → AI generates combined
 * - Team: Inherits kits+logo from club, optional own sponsor
 * - Season: Snapshot of team assets, can override sponsor/kit
 * - Match: Read-only display of season's identity
 * - Member: Profile photo + season's combined kit → player card
 */

import React, { useRef, useState } from 'react';
import {
  useBrandProfile,
  getAssetUrl,
  ASSET_TYPE_LABELS,
  KIT_ROLES,
  type BrandAsset,
  type BrandProfile,
} from '../../hooks/useBrandProfile';

// ============================================================================
// Types
// ============================================================================

export type IdentityLevel = 'organisation' | 'club' | 'team' | 'season' | 'match' | 'member';

interface IdentityTabProps {
  /** What level of the hierarchy */
  level: IdentityLevel;
  /** Organisation UUID */
  organisationId: string;
  /** Project ID (club or team) */
  projectId?: string | number | null;
  /** Parent project ID (club, when level=team) */
  parentProjectId?: string | number | null;
  /** Entity display name */
  entityName?: string;
  /** Read-only mode (match, member views) */
  readOnly?: boolean;
  /** Sponsor mode for teams: 'club' | 'custom' */
  sponsorMode?: 'club' | 'custom';
  /** Callback when sponsor mode changes */
  onSponsorModeChange?: (mode: 'club' | 'custom') => void;
}

// ============================================================================
// Sub-components
// ============================================================================

interface AssetCardProps {
  label: string;
  assetType: string;
  asset: BrandAsset | undefined;
  inherited?: boolean;
  inheritedFrom?: string;
  readOnly?: boolean;
  onUpload?: (file: File, assetType: string) => void;
  aspectRatio?: string;
}

function AssetCard({
  label,
  assetType,
  asset,
  inherited = false,
  inheritedFrom,
  readOnly = false,
  onUpload,
  aspectRatio = '3 / 4',
}: AssetCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const url = asset ? getAssetUrl(asset.url) : null;

  const isUploadType = assetType.endsWith('_upload');
  const isProcessed = !isUploadType && !assetType.endsWith('_combined');
  const isCombined = assetType.endsWith('_combined');

  let badgeColor = '#6b7280'; // gray
  let badgeText = '';
  if (isUploadType) {
    badgeColor = '#3b82f6'; // blue
    badgeText = 'Upload';
  } else if (isCombined) {
    badgeColor = '#8b5cf6'; // purple
    badgeText = 'AI Combined';
  } else if (isProcessed && !['watermark', 'favicon', 'font_file', 'location_photo', 'other'].includes(assetType)) {
    badgeColor = '#10b981'; // green
    badgeText = 'AI Bewerkt';
  }

  return (
    <div
      style={{
        border: '1px solid var(--vscode-widget-border, #333)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--vscode-editor-background, #1e1e1e)',
        opacity: inherited ? 0.8 : 1,
      }}
    >
      {/* Preview area */}
      <div
        style={{
          aspectRatio,
          background: url
            ? `url(${url}) center/contain no-repeat`
            : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
          position: 'relative',
          minHeight: 120,
        }}
      >
        {/* Phase badge */}
        {badgeText && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: badgeColor,
              color: '#fff',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            {badgeText}
          </span>
        )}

        {/* Inherited badge */}
        {inherited && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              background: '#f59e0b',
              color: '#000',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            ← {inheritedFrom || 'Geërfd'}
          </span>
        )}

        {/* Empty state */}
        {!url && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--vscode-descriptionForeground, #888)',
              fontSize: 12,
            }}
          >
            Niet ingesteld
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>

        {!readOnly && isUploadType && onUpload && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 11,
                cursor: 'pointer',
                background: 'var(--vscode-button-background, #0078d4)',
                color: 'var(--vscode-button-foreground, #fff)',
                border: 'none',
                borderRadius: 4,
              }}
            >
              {url ? 'Vervangen' : 'Uploaden'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file, assetType);
                e.target.value = '';
              }}
            />
          </>
        )}

        {asset && (
          <div style={{ fontSize: 10, color: 'var(--vscode-descriptionForeground, #888)', marginTop: 4 }}>
            {new Date(asset.updated_at).toLocaleDateString('nl-NL')}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section components
// ============================================================================

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #888)', marginBottom: 12 }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

function AssetGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function IdentityTab({
  level,
  organisationId,
  projectId,
  parentProjectId,
  entityName,
  readOnly = false,
  sponsorMode: externalSponsorMode,
  onSponsorModeChange,
}: IdentityTabProps) {
  // Load brand profile for this entity
  const {
    profile,
    assets,
    loading,
    error,
    getAsset,
    getAssetUrl: getAssetUrlByType,
    uploadAsset,
    refresh,
  } = useBrandProfile({
    organisationId: level === 'organisation' ? organisationId : undefined,
    projectId: level !== 'organisation' ? projectId : undefined,
  });

  // Load parent (club) brand profile for inheritance (team/season/match/member)
  const parentBrand = useBrandProfile({
    projectId: parentProjectId || undefined,
    autoFetch: !!parentProjectId,
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const sponsorMode = externalSponsorMode || 'club';

  const handleUpload = async (file: File, assetType: string) => {
    setUploading(assetType);
    const slug = entityName?.toLowerCase().replace(/\s+/g, '-') || 'entity';
    const prefix = `${level}s/${slug}/${assetType.replace('_upload', '')}`;
    await uploadAsset(file, assetType, prefix);
    setUploading(null);
  };

  // Helper: get asset from this level OR parent
  const getEffectiveAsset = (assetType: string): { asset: BrandAsset | undefined; inherited: boolean } => {
    const own = getAsset(assetType);
    if (own) return { asset: own, inherited: false };

    if (parentProjectId && parentBrand.getAsset) {
      const parent = parentBrand.getAsset(assetType);
      if (parent) return { asset: parent, inherited: true };
    }

    return { asset: undefined, inherited: false };
  };

  if (loading || parentBrand.loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--vscode-descriptionForeground, #888)' }}>
        Brand identity laden...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: 'var(--vscode-errorForeground, #f44)' }}>
        Fout bij laden: {error}
      </div>
    );
  }

  // ── ORGANISATION level ──
  if (level === 'organisation') {
    return (
      <div style={{ padding: 16 }}>
        <Section title="Organisatie Logo" description="Het logo van de organisatie.">
          <AssetGrid>
            <AssetCard
              label="Logo (upload)"
              assetType="logo_upload"
              asset={getAsset('logo_upload')}
              onUpload={handleUpload}
              readOnly={readOnly}
              aspectRatio="1 / 1"
            />
            <AssetCard label="Logo" assetType="logo" asset={getAsset('logo')} readOnly aspectRatio="1 / 1" />
          </AssetGrid>
        </Section>
      </div>
    );
  }

  // ── CLUB level ──
  if (level === 'club') {
    return (
      <div style={{ padding: 16 }}>
        {/* Logo */}
        <Section title="Logo" description="Upload het clublogo. De AI maakt er een gestandaardiseerde versie van.">
          <AssetGrid>
            <AssetCard label="Logo (upload)" assetType="logo_upload" asset={getAsset('logo_upload')} onUpload={handleUpload} aspectRatio="1 / 1" />
            <AssetCard label="Logo" assetType="logo" asset={getAsset('logo')} readOnly aspectRatio="1 / 1" />
          </AssetGrid>
        </Section>

        {/* Sponsor */}
        <Section title="Sponsor" description="Upload het sponsor logo. Wordt gestandaardiseerd door AI.">
          <AssetGrid>
            <AssetCard label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={getAsset('sponsor_logo_upload')} onUpload={handleUpload} aspectRatio="1 / 1" />
            <AssetCard label="Sponsor" assetType="sponsor_logo" asset={getAsset('sponsor_logo')} readOnly aspectRatio="1 / 1" />
          </AssetGrid>
        </Section>

        {/* Kits per role */}
        {KIT_ROLES.map((role) => {
          const uploadType = `kit_${role.id}_upload`;
          const processedType = `kit_${role.id}`;
          const combinedType = `kit_${role.id}_combined`;

          return (
            <Section
              key={role.id}
              title={`${role.icon} ${role.label} Tenue`}
              description={`Upload → AI bewerkt → Gecombineerd met logo + sponsor`}
            >
              <AssetGrid>
                <AssetCard
                  label={`${role.label} (upload)`}
                  assetType={uploadType}
                  asset={getAsset(uploadType)}
                  onUpload={handleUpload}
                />
                <AssetCard
                  label={`${role.label} (bewerkt)`}
                  assetType={processedType}
                  asset={getAsset(processedType)}
                  readOnly
                />
                <AssetCard
                  label={`${role.label} (compleet)`}
                  assetType={combinedType}
                  asset={getAsset(combinedType)}
                  readOnly
                />
              </AssetGrid>
            </Section>
          );
        })}

        {/* Location */}
        <Section title="📍 Locatie" description="Stadion of veld foto's.">
          <AssetGrid>
            <AssetCard
              label="Locatie foto"
              assetType="location_photo"
              asset={getAsset('location_photo')}
              onUpload={handleUpload}
              aspectRatio="16 / 9"
            />
          </AssetGrid>
        </Section>

        {!profile && (
          <div
            style={{
              padding: 16,
              background: 'var(--vscode-inputValidation-warningBackground, #5a4000)',
              border: '1px solid var(--vscode-inputValidation-warningBorder, #856d00)',
              borderRadius: 8,
              marginTop: 16,
              fontSize: 12,
            }}
          >
            ⚠️ Nog geen brand profiel aangemaakt voor deze club. Assets worden opgeslagen zodra er een brand profiel is.
          </div>
        )}
      </div>
    );
  }

  // ── TEAM level ──
  if (level === 'team') {
    return (
      <div style={{ padding: 16 }}>
        {/* Inherited logo */}
        <Section title="Logo" description="Geërfd van de club. Kan niet worden overschreven op teamniveau.">
          <AssetGrid>
            {(() => { const e = getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" readOnly aspectRatio="1 / 1" />
            ); })()}
          </AssetGrid>
        </Section>

        {/* Sponsor choice */}
        <Section title="Sponsor" description="Kies of dit team de club-sponsor erft, of een eigen sponsor heeft.">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => onSponsorModeChange?.('club')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
                background: sponsorMode === 'club' ? 'var(--vscode-button-background, #0078d4)' : 'transparent',
                color: sponsorMode === 'club' ? 'var(--vscode-button-foreground, #fff)' : 'var(--vscode-foreground, #ccc)',
                border: '1px solid var(--vscode-widget-border, #333)',
                borderRadius: 4,
              }}
            >
              Erven van club
            </button>
            <button
              onClick={() => onSponsorModeChange?.('custom')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
                background: sponsorMode === 'custom' ? 'var(--vscode-button-background, #0078d4)' : 'transparent',
                color: sponsorMode === 'custom' ? 'var(--vscode-button-foreground, #fff)' : 'var(--vscode-foreground, #ccc)',
                border: '1px solid var(--vscode-widget-border, #333)',
                borderRadius: 4,
              }}
            >
              Eigen sponsor
            </button>
          </div>

          <AssetGrid>
            {sponsorMode === 'club' ? (
              (() => { const e = getEffectiveAsset('sponsor_logo'); return (
                <AssetCard label="Sponsor (van club)" assetType="sponsor_logo" asset={e.asset} inherited inheritedFrom="Club" readOnly aspectRatio="1 / 1" />
              ); })()
            ) : (
              <>
                <AssetCard label="Sponsor (upload)" assetType="sponsor_logo_upload" asset={getAsset('sponsor_logo_upload')} onUpload={handleUpload} aspectRatio="1 / 1" />
                <AssetCard label="Sponsor (bewerkt)" assetType="sponsor_logo" asset={getAsset('sponsor_logo')} readOnly aspectRatio="1 / 1" />
              </>
            )}
          </AssetGrid>
        </Section>

        {/* Inherited kits */}
        <Section title="Tenues" description="Geërfd van de club. Gecombineerd met de team-sponsor.">
          {KIT_ROLES.slice(0, 4).map((role) => {
            const combinedType = `kit_${role.id}_combined`;
            const eff = getEffectiveAsset(combinedType);
            const kitEff = getEffectiveAsset(`kit_${role.id}`);

            return (
              <div key={role.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{role.icon} {role.label}</div>
                <AssetGrid>
                  <AssetCard
                    label={`${role.label} (bewerkt)`}
                    assetType={`kit_${role.id}`}
                    asset={kitEff.asset}
                    inherited={kitEff.inherited}
                    inheritedFrom="Club"
                    readOnly
                  />
                  <AssetCard
                    label={`${role.label} (compleet)`}
                    assetType={combinedType}
                    asset={eff.asset}
                    inherited={eff.inherited}
                    inheritedFrom={eff.inherited ? 'Club' : undefined}
                    readOnly
                  />
                </AssetGrid>
              </div>
            );
          })}
        </Section>
      </div>
    );
  }

  // ── SEASON level ──
  if (level === 'season') {
    return (
      <div style={{ padding: 16 }}>
        <Section title="Seizoen Identiteit" description="Snapshot van de team-identiteit voor dit seizoen. Tenue en sponsor kunnen per seizoen wijzigen.">
          {/* Logo - always inherited */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Logo</div>
            <AssetGrid>
              {(() => { const e = getEffectiveAsset('logo'); return (
                <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited={e.inherited} inheritedFrom="Club" readOnly aspectRatio="1 / 1" />
              ); })()}
            </AssetGrid>
          </div>

          {/* Sponsor - can override */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Sponsor</div>
            <AssetGrid>
              {(() => { const e = getEffectiveAsset('sponsor_logo'); return (
                <AssetCard
                  label={e.inherited ? 'Sponsor (van team/club)' : 'Sponsor'}
                  assetType="sponsor_logo"
                  asset={e.asset}
                  inherited={e.inherited}
                  inheritedFrom="Team"
                  readOnly={readOnly}
                  aspectRatio="1 / 1"
                />
              ); })()}
              {!readOnly && (
                <AssetCard
                  label="Sponsor uploaden (override)"
                  assetType="sponsor_logo_upload"
                  asset={getAsset('sponsor_logo_upload')}
                  onUpload={handleUpload}
                  aspectRatio="1 / 1"
                />
              )}
            </AssetGrid>
          </div>

          {/* Kits - combined with this season's sponsor */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Tenues (dit seizoen)</div>
            <AssetGrid>
              {KIT_ROLES.slice(0, 4).map((role) => {
                const combinedType = `kit_${role.id}_combined`;
                const eff = getEffectiveAsset(combinedType);
                return (
                  <AssetCard
                    key={role.id}
                    label={`${role.icon} ${role.label}`}
                    assetType={combinedType}
                    asset={eff.asset}
                    inherited={eff.inherited}
                    inheritedFrom={eff.inherited ? 'Team' : undefined}
                    readOnly
                  />
                );
              })}
            </AssetGrid>
          </div>
        </Section>
      </div>
    );
  }

  // ── MATCH level ──
  if (level === 'match') {
    return (
      <div style={{ padding: 16 }}>
        <Section title="Wedstrijd Identiteit" description="Visuele identiteit voor deze wedstrijd (read-only, geërfd van het seizoen).">
          <AssetGrid>
            {(() => { const e = getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited readOnly aspectRatio="1 / 1" />
            ); })()}
            {(() => { const e = getEffectiveAsset('kit_home_combined'); return (
              <AssetCard label="🏠 Thuistenue" assetType="kit_home_combined" asset={e.asset} inherited readOnly />
            ); })()}
            {(() => { const e = getEffectiveAsset('kit_away_combined'); return (
              <AssetCard label="✈️ Uittenue" assetType="kit_away_combined" asset={e.asset} inherited readOnly />
            ); })()}
            {(() => { const e = getEffectiveAsset('kit_goalkeeper_combined'); return (
              <AssetCard label="🧤 Keeper" assetType="kit_goalkeeper_combined" asset={e.asset} inherited readOnly />
            ); })()}
          </AssetGrid>
        </Section>
      </div>
    );
  }

  // ── MEMBER level ──
  if (level === 'member') {
    return (
      <div style={{ padding: 16 }}>
        <Section title="Speler Identiteit" description="Tenue en logo geërfd van het team/seizoen. Profielfoto van de gebruiker.">
          <AssetGrid>
            {(() => { const e = getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited inheritedFrom="Team" readOnly aspectRatio="1 / 1" />
            ); })()}
            {(() => { const e = getEffectiveAsset('kit_home_combined'); return (
              <AssetCard label="🏠 Tenue (compleet)" assetType="kit_home_combined" asset={e.asset} inherited inheritedFrom="Seizoen" readOnly />
            ); })()}
            {(() => { const e = getEffectiveAsset('sponsor_logo'); return (
              <AssetCard label="Sponsor" assetType="sponsor_logo" asset={e.asset} inherited inheritedFrom="Team" readOnly aspectRatio="1 / 1" />
            ); })()}
          </AssetGrid>
        </Section>
      </div>
    );
  }

  return null;
}

export default IdentityTab;
