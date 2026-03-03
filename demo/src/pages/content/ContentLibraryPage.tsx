/**
 * Content Library Page — Generated Content Browser
 *
 * Shows all generated content from templates, organized by hierarchy level
 * and content phase. Supports standalone and embedded modes.
 *
 * Split files:
 * - contentLibraryTypes.ts — Types, constants, utility functions
 * - ContentCard.tsx — ContentCard, FilterChip, EmptyState, ContentPreviewModal
 * - GalleryCreateContentButton.tsx — Quick-create button + modal
 * - useContentLibraryData.ts — Data hook with all state, effects, filter memos
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Stack, Text, Alert, Button } from '@django-core/design-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import MobileTabBar from '../../components/MobileTabBar';
import MobileFilterSheet from '../../components/MobileFilterSheet';
import { useAppSelection } from '../../hooks/useAppSelection';
import { getAssetUrl } from '../../hooks/useBrandProfile';

import {
  CONTENT_TYPE_FILTERS, CONTENT_CATEGORIES, LEVEL_LABELS,
  type HierarchyTab, type ContentCategory, type ContentItem,
} from './contentLibraryTypes';
import { ContentCard, FilterChip, EmptyState, ContentPreviewModal } from './ContentCard';
import { GalleryCreateContentButton } from './GalleryCreateContentButton';
import { useContentLibraryData } from './useContentLibraryData';
import { getAssetTypeLabel } from './contentLibraryTypes';

// ============================================================================
// Props Interface
// ============================================================================

export interface ContentLibraryViewProps {
  embedded?: boolean;
  overrideLevel?: HierarchyTab;
}

// ============================================================================
// Main View
// ============================================================================

export const ContentLibraryView: React.FC<ContentLibraryViewProps> = ({ embedded = false, overrideLevel }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { matchId } = useAppSelection();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const { user } = useAuth();
  const orgId = (context as any)?.organisation?.id as string | undefined;
  const orgSlug = (context as any)?.organisation?.slug as string | undefined;
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  // URL params
  const params = new URLSearchParams(location.search);
  const rawTab = overrideLevel || params.get('level') || params.get('tab') || 'match';
  const activeLevel = (['match', 'season', 'member', 'team', 'club'].includes(rawTab) ? rawTab : 'match') as HierarchyTab;
  const urlCategory = params.get('category') as ContentCategory | null;

  // Data hook
  const data = useContentLibraryData({ isSuperAdmin, myOrganisations, orgSlug, activeLevel, urlCategory });

  // Preview state
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

  // ── Handlers ──
  const handlePreview = (item: ContentItem) => setPreviewItem(item);

  const handleDownload = async (item: ContentItem) => {
    const url = item.file_url || getAssetUrl(item.storage_path);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = item.title || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async (item: ContentItem) => {
    const url = item.file_url || getAssetUrl(item.storage_path);
    if (navigator.share && url) {
      try { await navigator.share({ title: item.title || 'Generated Content', url }); } catch { /* cancelled */ }
    } else if (url) {
      await navigator.clipboard.writeText(url);
      alert('Link gekopieerd naar klembord');
    }
  };

  const handleDelete = async (item: ContentItem) => {
    if (confirm(`Weet je zeker dat je "${item.title || 'dit item'}" wilt verwijderen?`)) {
      try {
        const apiBaseUrl = (await import('../../utils/apiBase')).getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/v1/media/items/${item.id}/`, { method: 'DELETE', credentials: 'include' });
        if (response.ok) {
          data.setContentItems(prev => prev.filter(i => i.id !== item.id));
        } else { alert('Verwijderen mislukt'); }
      } catch { alert('Verwijderen mislukt'); }
    }
  };

  if (!orgId) {
    return (
      <div style={{ minHeight: embedded ? 'auto' : '100vh', backgroundColor: 'var(--app-bg)', padding: 24 }}>
        <Alert variant="info">Selecteer een organisatie om de content library te bekijken.</Alert>
      </div>
    );
  }

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', backgroundColor: 'var(--app-bg)' }}>
      {/* Header */}
      {!embedded && (
        <div className="p-24 border-bottom bg-surface">
          <div className="flex-between gap-12">
            <Stack direction="column" gap="1">
              <Text size="xl" weight="bold">Gallery</Text>
              <Text size="md" color="secondary">Al je gegenereerde content op één plek</Text>
            </Stack>
            <GalleryCreateContentButton />
          </div>
        </div>
      )}

      {/* Mobile category tab bar */}
      {!embedded && (
        <div style={{ padding: '12px 16px 0' }}>
          <MobileTabBar
            tabs={[
              { id: 'all', label: 'Alles' },
              { id: 'pre_match', label: 'Pre-Match' },
              { id: 'during_match', label: 'During Match' },
              { id: 'post_match', label: 'Post-Match' },
              { id: 'season', label: 'Season' },
              { id: 'member', label: 'Member' },
            ]}
            activeTab={data.categoryFilter}
            basePath="/studio"
            paramName="category"
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="gallery-toolbar flex-row gap-12 flex-wrap border-bottom py-16 px-24">
        <input
          type="text"
          value={data.searchQuery}
          onChange={(e) => data.setSearchQuery(e.target.value)}
          placeholder="Zoeken..."
          className="flex-1 fs-13 rounded-6 border bg-surface"
          style={{ minWidth: 120, padding: '8px 12px' }}
        />
        <MobileFilterSheet
          activeFilterCount={
            (data.sortBy !== 'newest' ? 1 : 0) +
            (data.selectedOrgId ? 1 : 0) +
            (data.selectedClubId ? 1 : 0) +
            (data.selectedTeamId ? 1 : 0) +
            (data.selectedSeasonId ? 1 : 0) +
            (data.selectedMatchId ? 1 : 0)
          }
        >
          <label className="fs-12 fw-600 text-muted">Sortering</label>
          <select value={data.sortBy} onChange={(e) => data.setSortBy(e.target.value as any)} className="rounded-6 border bg-surface fs-13 w-full" style={{ padding: '8px 12px', minWidth: 140 }}>
            <option value="newest">Nieuwste eerst</option>
            <option value="oldest">Oudste eerst</option>
            <option value="title">A-Z op titel</option>
            <option value="type">Op type</option>
          </select>

          {isSuperAdmin && data.organisations.length > 1 && (
            <>
              <label className="fs-12 fw-600 text-muted">Federatie</label>
              <select
                value={data.selectedOrgId}
                onChange={(e) => { data.setSelectedOrgId(e.target.value); data.setSelectedClubId(''); data.setSelectedTeamId(''); data.setSelectedSeasonId(''); data.setSelectedMatchId(''); }}
                className="rounded-6 border bg-surface fs-13 w-full" style={{ padding: '8px 12px', minWidth: 160 }}
              >
                <option value="">Federation: All</option>
                {[...data.organisations].sort((a, b) => a.name.localeCompare(b.name)).map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </>
          )}

          {data.clubs.length > 0 && (
            <>
              <label className="fs-12 fw-600 text-muted">Club</label>
              <select
                value={data.selectedClubId}
                onChange={(e) => { data.setSelectedClubId(e.target.value); data.setSelectedTeamId(''); data.setSelectedSeasonId(''); data.setSelectedMatchId(''); }}
                className="rounded-6 border bg-surface fs-13 w-full" style={{ padding: '8px 12px', minWidth: 160 }}
              >
                <option value="">Club: All</option>
                {[...data.clubs].sort((a, b) => a.name.localeCompare(b.name)).map((club) => (
                  <option key={club.id} value={club.id}>{club.name}</option>
                ))}
              </select>
            </>
          )}

          {data.filteredTeams.length > 0 && (
            <>
              <label className="fs-12 fw-600 text-muted">Team</label>
              <select
                value={data.selectedTeamId}
                onChange={(e) => { data.setSelectedTeamId(e.target.value); data.setSelectedSeasonId(''); data.setSelectedMatchId(''); }}
                className="rounded-6 border bg-surface fs-13 w-full" style={{ padding: '8px 12px', minWidth: 160 }}
              >
                <option value="">Team: All</option>
                {[...data.filteredTeams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </>
          )}

          {data.seasons.length > 0 && (
            <>
              <label className="fs-12 fw-600 text-muted">Seizoen</label>
              <select
                value={data.selectedSeasonId}
                onChange={(e) => { data.setSelectedSeasonId(e.target.value); data.setSelectedMatchId(''); }}
                className="rounded-6 border bg-surface fs-13 w-full" style={{ padding: '8px 12px', minWidth: 160 }}
              >
                <option value="">Season: All</option>
                {data.seasons.map((season) => (
                  <option key={season.id} value={season.id}>{season.name}</option>
                ))}
              </select>
            </>
          )}

          {activeLevel === 'match' && data.matches.length > 0 && (
            <>
              <label className="fs-12 fw-600 text-muted">Wedstrijd</label>
              <select
                value={data.selectedMatchId}
                onChange={(e) => data.setSelectedMatchId(e.target.value)}
                className="rounded-6 border bg-surface fs-13 w-full" style={{ padding: '8px 12px', minWidth: 200 }}
              >
                <option value="">Match: All</option>
                {data.matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.title}
                    {match.activity_date && ` (${new Date(match.activity_date).toLocaleDateString('nl-NL')})`}
                  </option>
                ))}
              </select>
            </>
          )}

          <Button variant="secondary" size="md" onClick={data.clearFilters} className="w-full mt-4">
            Filters wissen
          </Button>
        </MobileFilterSheet>
      </div>

      {/* Content area */}
      <div className="gallery-content p-24 mx-auto" style={{ maxWidth: 1400 }}>
        <Stack direction="column" gap="4">
          {/* Subtype chips (category has subtypes) */}
          {data.categoryFilter !== 'all' && CONTENT_CATEGORIES.find(c => c.key === data.categoryFilter)?.subtypes.length! > 0 && (
            <div className="gallery-chips flex-row flex-wrap gap-6">
              <FilterChip active={data.subtypeFilter === 'all'} onClick={() => data.setSubtypeFilter('all')} label="All" count={data.subtypeCounts.all || 0} />
              {CONTENT_CATEGORIES.find(c => c.key === data.categoryFilter)?.subtypes.map(st => {
                const filter = CONTENT_TYPE_FILTERS.find(f => f.key === st);
                return (
                  <FilterChip
                    key={st}
                    active={data.subtypeFilter === st}
                    onClick={() => data.setSubtypeFilter(st)}
                    label={`${filter?.icon || '📄'} ${filter?.label || getAssetTypeLabel(st)}`}
                    count={data.subtypeCounts[st] || 0}
                  />
                );
              })}
            </div>
          )}

          {data.categoryFilter === 'all' && (
            <div className="gallery-chips flex-row flex-wrap gap-6">
              {CONTENT_TYPE_FILTERS.map(({ key, label, icon }) => (
                <FilterChip key={key} active={data.subtypeFilter === key} onClick={() => data.setSubtypeFilter(key)} label={`${icon} ${label}`} count={data.subtypeCounts[key] || 0} />
              ))}
            </div>
          )}

          {data.error && <Alert variant="error">{data.error}</Alert>}

          {data.loading && (
            <div className="text-center" style={{ padding: 48 }}><Text color="secondary">Content laden...</Text></div>
          )}

          {!data.loading && (
            data.filteredContent.length > 0 ? (
              <div className="gallery-grid grid gap-16" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {data.filteredContent.map((item) => (
                  <ContentCard key={item.id} item={item} onPreview={handlePreview} onDownload={handleDownload} onShare={handleShare} onDelete={handleDelete} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="🎬"
                message={data.contentItems.length > 0 ? 'Geen content gevonden.' : matchId ? 'Nog geen content voor deze wedstrijd.' : 'Selecteer een wedstrijd om content te maken.'}
                sub={data.contentItems.length > 0 ? 'Pas je filters of zoekopdracht aan.' : matchId ? 'Gebruik de + Create knop hierboven om te beginnen.' : 'Kies eerst een actieve wedstrijd via Matches.'}
                action={data.contentItems.length === 0 && !matchId ? (
                  <Button variant="primary" size="md" onClick={() => navigate('/matches')} className="mt-4">Ga naar Wedstrijden</Button>
                ) : undefined}
              />
            )
          )}

          <div className="flex-between py-8">
            <Text size="xs" color="secondary">{data.filteredContent.length} van {data.contentItems.length} items</Text>
          </div>
        </Stack>
      </div>

      {/* Preview Modal */}
      {previewItem && <ContentPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  );
};

// Re-export types for external consumers
export type { ContentItem, HierarchyTab };

// ============================================================================
// Standalone Page Export
// ============================================================================

const ContentLibraryPage: React.FC = () => <ContentLibraryView embedded={false} />;
export default ContentLibraryPage;
