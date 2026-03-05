/**
 * AssetsTab — Visual brand assets display component (orchestrator)
 *
 * Separated from IdentityTab to distinguish:
 * - AssetsTab: visual assets (logos, kits, sponsors, photos)
 * - Identity tab: design tokens (colors, fonts, spacing)
 *
 * Used across Club, Team, Season, Match, and Member detail pages.
 * Shows logo, kits, sponsor with inheritance indicators.
 *
 * Decomposed (Phase 23 → Phase 24):
 * - AssetSubComponents.tsx      → AssetCard, Section, AssetGrid, HistoryModal
 * - assetsTabHelpers.ts         → AssetsLevel type, constants
 * - useAssetsTabData.ts         → All state, effects, handlers
 * - AssetsTabShared.tsx         → SharedAssetModals, AiButtonsRow
 * - AssetsTabClubLevel.tsx      → Club-level JSX (with ClubBackgrounds sub)
 * - AssetsTabTeamLevel.tsx      → Team-level JSX (with inheritance)
 * - AssetsTabSeasonLevel.tsx    → Season-level JSX (with override logic)
 * - AssetsTab.tsx               → Orchestrator (this file)
 */

import React from 'react';
import { AssetCard, Section, AssetGrid } from './AssetSubComponents';
import { useAssetsTabData } from './useAssetsTabData';
import { AssetsTabClubLevel } from './AssetsTabClubLevel';
import { AssetsTabTeamLevel } from './AssetsTabTeamLevel';
import { AssetsTabSeasonLevel } from './AssetsTabSeasonLevel';
import type { AssetsLevel } from './assetsTabHelpers';
import s from './AssetsTab.module.css';

export type { AssetsLevel } from './assetsTabHelpers';

// ============================================================================
// Props
// ============================================================================

interface AssetsTabProps {
  /** What level of the hierarchy */
  level: AssetsLevel;
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
// Main Component
// ============================================================================

export function AssetsTab({
  level,
  organisationId,
  projectId,
  parentProjectId,
  entityName,
  readOnly = false,
  sponsorMode: externalSponsorMode,
  onSponsorModeChange,
}: AssetsTabProps) {
  const d = useAssetsTabData({
    level,
    organisationId,
    projectId,
    parentProjectId,
    entityName,
    readOnly,
    sponsorMode: externalSponsorMode,
  });

  // ── Loading / Error ──
  if (d.loading || d.parentLoading) {
    return (
      <div className={`p-24 text-center ${s.loadingText}`}>
        Assets laden...
      </div>
    );
  }

  if (d.error) {
    return (
      <div className={`p-24 ${s.errorText}`}>
        Fout bij laden: {d.error}
      </div>
    );
  }

  // ── ORGANISATION level (simple: 2 cards) ──
  if (level === 'organisation') {
    return (
      <div className="p-16">
        <Section title="Organisatie Logo" description="Het logo van de organisatie.">
          <AssetGrid>
            <AssetCard label="Logo (upload)" assetType="logo_upload" asset={d.getAsset('logo_upload')} onUpload={d.handleUpload} onDelete={d.handleDelete} readOnly={readOnly} aspectRatio="1 / 1" />
            <AssetCard label="Logo (bewerkt)" assetType="logo" asset={d.getAsset('logo')} onUpload={d.handleUpload} onDelete={d.handleDelete} aspectRatio="1 / 1" />
          </AssetGrid>
        </Section>
      </div>
    );
  }

  // ── CLUB level ──
  if (level === 'club') {
    return <AssetsTabClubLevel d={d} readOnly={readOnly} projectId={projectId || ''} organisationId={organisationId} />;
  }

  // ── TEAM level ──
  if (level === 'team') {
    return <AssetsTabTeamLevel d={d} readOnly={readOnly} projectId={projectId || ''} organisationId={organisationId} />;
  }

  // ── SEASON level ──
  if (level === 'season') {
    return <AssetsTabSeasonLevel d={d} readOnly={readOnly} />;
  }

  // ── MATCH level (read-only, inherited) ──
  if (level === 'match') {
    return (
      <div className="p-16">
        <Section title="Wedstrijd Assets" description="Visuele assets voor deze wedstrijd (read-only, geërfd van het seizoen).">
          <AssetGrid>
            {(() => { const e = d.getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited readOnly aspectRatio="1 / 1" />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('kit_home_combined'); return (
              <AssetCard label="Thuistenue" assetType="kit_home_combined" asset={e.asset} inherited readOnly />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('kit_away_combined'); return (
              <AssetCard label="Uittenue" assetType="kit_away_combined" asset={e.asset} inherited readOnly />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('kit_goalkeeper_combined'); return (
              <AssetCard label="Keeper" assetType="kit_goalkeeper_combined" asset={e.asset} inherited readOnly />
            ); })()}
          </AssetGrid>
        </Section>
      </div>
    );
  }

  // ── MEMBER level (read-only, inherited) ──
  if (level === 'member') {
    return (
      <div className="p-16">
        <Section title="Speler Assets" description="Tenue en logo geërfd van het team/seizoen.">
          <AssetGrid>
            {(() => { const e = d.getEffectiveAsset('logo'); return (
              <AssetCard label="Logo" assetType="logo" asset={e.asset} inherited inheritedFrom="Team" readOnly aspectRatio="1 / 1" />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('kit_home_combined'); return (
              <AssetCard label="Tenue (compleet)" assetType="kit_home_combined" asset={e.asset} inherited inheritedFrom="Seizoen" readOnly />
            ); })()}
            {(() => { const e = d.getEffectiveAsset('sponsor_logo'); return (
              <AssetCard label="Sponsor" assetType="sponsor_logo" asset={e.asset} inherited inheritedFrom="Team" readOnly aspectRatio="1 / 1" />
            ); })()}
          </AssetGrid>
        </Section>
      </div>
    );
  }

  return null;
}

export default AssetsTab;
