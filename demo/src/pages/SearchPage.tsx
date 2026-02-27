import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSearch, type GroupedSearchResults, type PaginatedSearchResults, type SearchResult } from '../hooks/useSearch';
import AppShell from '../components/AppShell';
import HierarchyTreeView from '../components/HierarchyTreeView';
import { BottomSheet, Button } from '@django-core/design-system';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const typesParam = searchParams.get('types');
  const showHierarchy = searchParams.get('hierarchy') === 'true';
  // Memoize types array to prevent infinite loop in useEffect
  const types = useMemo(() => typesParam?.split(',').filter(Boolean) || [], [typesParam]);
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [groupedResults, setGroupedResults] = useState<GroupedSearchResults | null>(null);
  const [paginatedResults, setPaginatedResults] = useState<PaginatedSearchResults | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const { searchGlobal, searchFiltered, searchHierarchical, isSearching, error } = useSearch();

  const isFiltered = types.length > 0;

  // Perform search when query/types/page changes
  useEffect(() => {
    if (query.trim()) {
      if (isFiltered) {
        searchFiltered(query, types, page).then(setPaginatedResults);
      } else if (showHierarchy) {
        searchHierarchical(query).then(setGroupedResults);
      } else {
        searchGlobal(query).then(setGroupedResults);
      }
    }
  }, [query, types, page, isFiltered, showHierarchy, searchGlobal, searchFiltered, searchHierarchical]);

  const handleCategoryClick = (category: string) => {
    setSearchParams({ q: query, types: category });
    setIsFilterSheetOpen(false);
  };

  const handleClearFilter = () => {
    setSearchParams({ q: query });
    setIsFilterSheetOpen(false);
  };

  const handleHierarchyToggle = () => {
    if (showHierarchy) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({ q: query, hierarchy: 'true' });
    }
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: query, types: types.join(','), page: newPage.toString() });
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      organisations: 'Federations',
      clubs: 'Clubs',
      teams: 'Teams',
      seasons: 'Seasons',
      competitions: 'Competitions',
      matches: 'Matches',
      users: 'Users',
      periods: 'Periods',
      activities: 'Activities',
      projects: 'Projects',
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      organisations: '🏛️',
      clubs: '🏟️',
      teams: '👕',
      seasons: '🗓️',
      competitions: '🏆',
      matches: '🎯',
      users: '👥',
      periods: '🗓️',
      activities: '📅',
      projects: '📁',
    };
    return icons[category] || '📄';
  };

  const allCategories = ['organisations', 'clubs', 'teams', 'seasons', 'competitions', 'matches', 'users', 'periods', 'activities', 'projects'];

  const totalResults = groupedResults
    ? (groupedResults.clubs?.length || 0) +
      (groupedResults.teams?.length || 0) +
      (groupedResults.seasons?.length || 0) +
      (groupedResults.competitions?.length || 0) +
      (groupedResults.periods?.length || 0) +
      (groupedResults.matches?.length || 0) +
      (groupedResults.activities?.length || 0) +
      (groupedResults.users?.length || 0) +
      (groupedResults.organisations?.length || 0) +
      (groupedResults.projects?.length || 0)
    : paginatedResults?.count || 0;

  return (
    <AppShell>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
              Search Results
            </h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Mobile Filter Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFilterSheetOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🔍 Filters
                {isFiltered && (
                  <span style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {types.length}
                  </span>
                )}
              </Button>
              {/* Hierarchy Toggle */}
              {query && !isFiltered && (
                <button
                onClick={handleHierarchyToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: showHierarchy ? 'var(--color-primary, #3b82f6)' : 'var(--color-bg-surface)',
                  color: showHierarchy ? '#fff' : 'var(--color-text-primary)',
                  border: showHierarchy ? 'none' : '1px solid var(--color-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                🌳 {showHierarchy ? 'Hierarchy On' : 'Show Hierarchy'}
              </button>
            )}
            </div>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px' }}>
            {query ? (
              <>
                Showing results for <strong>"{query}"</strong>
                {isFiltered && (
                  <>
                    {' '}
                    in <strong>{getCategoryLabel(types[0])}</strong>
                    <button
                      onClick={handleClearFilter}
                      style={{
                        marginLeft: '12px',
                        padding: '4px 12px',
                        fontSize: '14px',
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Clear Filter
                    </button>
                  </>
                )}
              </>
            ) : (
              'Enter a search query to get started'
            )}
          </p>
        </div>

        {isSearching && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div className="spinner" style={{ marginBottom: '16px' }}></div>
            Searching...
          </div>
        )}

        {error && (
          <div style={{ padding: '16px', background: 'var(--color-error-bg)', color: 'var(--color-error-text)', borderRadius: '8px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {!isSearching && !error && totalResults === 0 && query && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--color-text-primary)' }}>No results found</h3>
            <p>We couldn't find anything matching "{query}". Try different keywords or check for typos.</p>
          </div>
        )}

        {/* Hierarchy Tree View (when enabled) */}
        {!isSearching && !error && groupedResults?.hierarchy && showHierarchy && (
          <div style={{ marginBottom: '32px' }}>
            <HierarchyTreeView hierarchy={groupedResults.hierarchy} />
          </div>
        )}

        {!isSearching && !error && groupedResults && !isFiltered && (
          <div style={{ display: 'grid', gap: '32px' }}>
            {(Object.entries(groupedResults) as [string, SearchResult[]][])
              .filter(([category]) => category !== 'hierarchy')
              .map(([category, results]) => {
              if (!results || results.length === 0) return null;
              return (
                <div key={category}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
                      <span>{getCategoryIcon(category)}</span>
                      {getCategoryLabel(category)}
                      <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                        {results.length}
                      </span>
                    </h2>
                    {results.length >= 5 && (
                      <button
                        onClick={() => handleCategoryClick(category)}
                        style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
                      >
                        View All
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {results.map((result) => (
                      <Link
                        key={result.id}
                        to={result.url}
                        style={{
                          display: 'block',
                          padding: '16px',
                          background: 'var(--color-bg-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          transition: 'transform 0.1s, box-shadow 0.1s',
                        }}
                        className="search-result-card"
                      >
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-text-primary)' }}>
                          {result.title}
                        </h3>
                        {result.description && (
                          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', lineHeight: '1.5' }}>
                            {result.description}
                          </p>
                        )}
                        {result.highlight && (
                          <div
                            style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}
                            dangerouslySetInnerHTML={{ __html: result.highlight }}
                          />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isSearching && !error && paginatedResults && isFiltered && (
          <div>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              {paginatedResults.results.map((result) => (
                <Link
                  key={result.id}
                  to={result.url}
                  style={{
                    display: 'block',
                    padding: '16px',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                  }}
                  className="search-result-card"
                >
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-text-primary)' }}>
                    {result.title}
                  </h3>
                  {result.description && (
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', lineHeight: '1.5' }}>
                      {result.description}
                    </p>
                  )}
                  {result.highlight && (
                    <div
                      style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}
                      dangerouslySetInnerHTML={{ __html: result.highlight }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '32px' }}>
              <button
                disabled={!paginatedResults.previous}
                onClick={() => handlePageChange(page - 1)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  cursor: paginatedResults.previous ? 'pointer' : 'not-allowed',
                  opacity: paginatedResults.previous ? 1 : 0.5,
                }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-secondary)' }}>
                Page {page}
              </span>
              <button
                disabled={!paginatedResults.next}
                onClick={() => handlePageChange(page + 1)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  cursor: paginatedResults.next ? 'pointer' : 'not-allowed',
                  opacity: paginatedResults.next ? 1 : 0.5,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Filter BottomSheet */}
      <BottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter op categorie"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Clear Filter Option */}
          <button
            onClick={handleClearFilter}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: !isFiltered ? 'var(--color-primary-bg, rgba(59, 130, 246, 0.1))' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: '44px',
            }}
          >
            <span style={{ fontSize: '20px' }}>🔍</span>
            <span style={{ fontWeight: !isFiltered ? '600' : '400', color: 'var(--color-text-primary)' }}>
              Alle categorieën
            </span>
          </button>

          {/* Category Options */}
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: types.includes(category) ? 'var(--color-primary-bg, rgba(59, 130, 246, 0.1))' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: '44px',
              }}
            >
              <span style={{ fontSize: '20px' }}>{getCategoryIcon(category)}</span>
              <span style={{ fontWeight: types.includes(category) ? '600' : '400', color: 'var(--color-text-primary)' }}>
                {getCategoryLabel(category)}
              </span>
              {types.includes(category) && (
                <span style={{ marginLeft: 'auto', color: 'var(--color-primary)' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </AppShell>
  );
}
