/**
 * Media Library Page — Unified Asset Browser
 *
 * Shows all brand assets and file uploads for the active organisation,
 * organized by hierarchy level (Organisation, Club, Team, Member) with
 * content-type sub-filters per level.
 *
 * Panel B tabs: Organisation, Club, Team, Member, Files
 *
 * Data sources:
 * - Brand Assets via /api/v1/branding/profiles → assets
 * - File Assets via /api/v1/files/
 */

import React from 'react';
import { Card, Stack, Text, Alert, Button } from '@django-core/design-system';
import type { FileTypeFilter } from '../../hooks/useFileAssets';
import type { HierarchyTab } from './medialibHelpers';
import { KIT_TYPES, SUB_TABS } from './medialibHelpers';
import {
  PreviewModal,
  AssetCard,
  FileCard,
  MemberMediaCard,
  FilterChip,
  EmptyState,
} from './MediaLibCards';
import { useMediaLibData } from './useMediaLibData';

// Level labels for header
const LEVEL_LABELS: Record<HierarchyTab, string> = {
  organisation: 'Organisatie',
  club: 'Club',
  team: 'Team',
  member: 'Speler',
  files: 'Bestanden',
};

const MediaLibraryPage: React.FC = () => {
  const {
    orgId, orgSlug, isSuperAdmin, activeLevel,
    brandAssets, memberMedia, files,
    filteredBrandAssets, filteredFiles, filteredMemberMedia, filteredTeams,
    subTabCounts, fileTypeCounts,
    organisations, clubs,
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    subFilter, setSubFilter,
    kitFilter, setKitFilter,
    fileTypeFilter, setFileTypeFilter,
    searchQuery, setSearchQuery,
    previewItem, setPreviewItem,
    loading, error,
    handleDownload, clearFilters,
  } = useMediaLibData();

  if (!orgId) {
    return (
      <div className="p-24 bg-primary" style={{ minHeight: '100vh' }}>
        <Alert variant="info">Selecteer een organisatie om de media library te bekijken.</Alert>
      </div>
    );
  }

  return (
    <div className="bg-primary" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="p-24 border-bottom bg-surface">
        <Stack direction="column" gap="1">
          <Text size="xl" weight="bold">Media Library</Text>
          <Text size="md" color="secondary">
            {LEVEL_LABELS[activeLevel]} assets
          </Text>
        </Stack>
      </div>

      {/* Toolbar: directory-style filters */}
      <div className="py-16 px-24 flex-row gap-12 flex-wrap border-bottom">
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoeken..."
          className="flex-1 py-8 px-12 rounded-6 border bg-surface fs-13"
          style={{ minWidth: 180 }}
        />

        {/* Organisation filter (only for superadmin) */}
        {isSuperAdmin && organisations.length > 1 && activeLevel !== 'files' && (
          <select
            value={selectedOrgId}
            onChange={(e) => {
              setSelectedOrgId(e.target.value);
              setSelectedClubId('');
              setSelectedTeamId('');
            }}
            className="py-8 px-12 rounded-6 border bg-surface fs-13"
            style={{ minWidth: 160 }}
          >
            <option value="">Federation: All</option>
            {[...organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        )}

        {/* Club filter (for club, team, member levels) */}
        {['club', 'team', 'member'].includes(activeLevel) && clubs.length > 0 && (
          <select
            value={selectedClubId}
            onChange={(e) => {
              setSelectedClubId(e.target.value);
              setSelectedTeamId('');
            }}
            className="py-8 px-12 rounded-6 border bg-surface fs-13"
            style={{ minWidth: 160 }}
          >
            <option value="">Club: All</option>
            {[...clubs].sort((a, b) => a.name.localeCompare(b.name)).map((club) => (
              <option key={club.id} value={club.id}>{club.name}</option>
            ))}
          </select>
        )}

        {/* Team filter (for team, member levels) */}
        {['team', 'member'].includes(activeLevel) && filteredTeams.length > 0 && (
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="py-8 px-12 rounded-6 border bg-surface fs-13"
            style={{ minWidth: 160 }}
          >
            <option value="">Team: All</option>
            {[...filteredTeams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        )}

        {/* Clear button */}
        <Button
          variant="secondary"
          size="md"
          onClick={clearFilters}
          className="ml-auto"
        >
          Clear
        </Button>
      </div>

      {/* Content area */}
      <div className="p-24 mx-auto" style={{ maxWidth: 1400 }}>
        <Stack direction="column" gap="4">

          {/* Sub-tabs (content type chips) */}
          {activeLevel !== 'files' && (
            <div className="flex-row flex-wrap gap-6">
              {SUB_TABS[activeLevel].map(({ key, label }) => {
                const count = subTabCounts[key] || 0;
                return (
                  <FilterChip
                    key={key}
                    active={subFilter === key}
                    onClick={() => setSubFilter(key)}
                    label={label}
                    count={count}
                  />
                );
              })}
            </div>
          )}

          {/* Kit type filter */}
          {((subFilter === 'kit' && (activeLevel === 'club' || activeLevel === 'team')) ||
            ((subFilter === 'member_fullbody' || subFilter === 'member_closeup') && activeLevel === 'member')) && (
            <div className="flex-row flex-wrap gap-6 mt-8">
              {KIT_TYPES.map(({ key, label }) => (
                <FilterChip
                  key={key}
                  active={kitFilter === key}
                  onClick={() => setKitFilter(key)}
                  label={label}
                />
              ))}
            </div>
          )}

          {/* File type sub-filter chips (for files tab) */}
          {activeLevel === 'files' && (
            <div className="flex-row flex-wrap gap-6">
              {SUB_TABS.files.map(({ key, label }) => {
                const count = fileTypeCounts[key as keyof typeof fileTypeCounts] || 0;
                return (
                  <FilterChip
                    key={key}
                    active={fileTypeFilter === key as FileTypeFilter}
                    onClick={() => setFileTypeFilter(key as FileTypeFilter)}
                    label={label}
                    count={count}
                  />
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && <Alert variant="error">{error}</Alert>}

          {/* Loading */}
          {loading && (
            <div className="text-center" style={{ padding: 48 }}>
              <Text color="secondary">Assets laden...</Text>
            </div>
          )}

          {/* Brand Assets Grid (org, club, team) */}
          {activeLevel !== 'files' && activeLevel !== 'member' && !loading && (
            filteredBrandAssets.length > 0 ? (
              <div className="grid gap-16" style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}>
                {filteredBrandAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    orgSlugOrId={orgSlug || orgId}
                    onPreview={(it) => setPreviewItem(it)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon="🏷️" message="Geen assets gevonden." sub={
                brandAssets.length > 0 ? 'Pas je filters of zoekopdracht aan.' : "Upload assets via Brand Identity."
              } />
            )
          )}

          {/* Member Media Grid */}
          {activeLevel === 'member' && !loading && (
            filteredMemberMedia.length > 0 ? (
              <div className="grid gap-16" style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}>
                {filteredMemberMedia.map((item) => (
                  <MemberMediaCard
                    key={item.id}
                    item={item}
                    orgSlugOrId={orgSlug || orgId}
                    onPreview={(it) => setPreviewItem(it)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon="👤" message="Geen speler media gevonden." sub={
                memberMedia.length > 0 ? 'Pas je filters of zoekopdracht aan.' : "Genereer speler assets via de team/seizoen pagina."
              } />
            )
          )}

          {/* File Assets Grid */}
          {activeLevel === 'files' && !loading && (
            filteredFiles.length > 0 ? (
              <div className="grid gap-16" style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              }}>
                {filteredFiles.map((file) => (
                  <FileCard key={file.id} file={file} onDownload={handleDownload} />
                ))}
              </div>
            ) : (
              <EmptyState icon="📁" message="Geen bestanden gevonden." sub={
                files.length > 0 ? 'Pas je zoekopdracht aan.' : 'Upload bestanden om ze hier te zien.'
              } />
            )
          )}

          {/* Summary */}
          <div className="flex-between py-8">
            <Text size="xs" color="secondary">
              {activeLevel === 'files'
                ? `${filteredFiles.length} van ${files.length} bestanden`
                : activeLevel === 'member'
                ? `${filteredMemberMedia.length} van ${memberMedia.length} speler media`
                : `${filteredBrandAssets.length} van ${brandAssets.length} assets`
              }
            </Text>
          </div>
        </Stack>
      </div>

      {previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
};

export default MediaLibraryPage;
