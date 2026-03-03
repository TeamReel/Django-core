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
      <div className="page-container">
        <div className="mb-24">
          <div className="flex-between mb-8 flex-wrap gap-12">
            <h1 className="fw-700 text-primary" style={{ fontSize: '28px' }}>
              Search Results
            </h1>
            <div className="flex-row gap-8">
              {/* Mobile Filter Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFilterSheetOpen(true)}
                className="flex-row gap-6"
              >
                🔍 Filters
                {isFiltered && (
                  <span className="flex-center fs-11 rounded-full text-white" style={{ background: 'var(--color-primary)', width: '18px', height: '18px' }}>
                    {types.length}
                  </span>
                )}
              </Button>
              {/* Hierarchy Toggle */}
              {query && !isFiltered && (
                <button
                onClick={handleHierarchyToggle}
                className="flex-row gap-8 py-8 px-16 fs-14 fw-500 rounded-8 cursor-pointer"
                style={{
                  background: showHierarchy ? 'var(--color-primary, #3b82f6)' : 'var(--color-bg-surface)',
                  color: showHierarchy ? '#fff' : 'var(--color-text-primary)',
                  border: showHierarchy ? 'none' : '1px solid var(--color-border)',
                  transition: 'all var(--duration-normal)',
                }}
              >
                🌳 {showHierarchy ? 'Hierarchy On' : 'Show Hierarchy'}
              </button>
            )}
            </div>
          </div>
          <p className="fs-16 text-secondary">
            {query ? (
              <>
                Showing results for <strong>"{query}"</strong>
                {isFiltered && (
                  <>
                    {' '}
                    in <strong>{getCategoryLabel(types[0])}</strong>
                    <button
                      onClick={handleClearFilter}
                      className="fs-14 rounded-4 cursor-pointer py-4 px-12"
                      style={{
                        marginLeft: '12px',
                        background: 'none',
                        border: '1px solid var(--color-border)',
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
          <div className="text-center p-32 text-secondary">
            <div className="spinner mb-16"></div>
            Searching...
          </div>
        )}

        {error && (
          <div className="p-16 rounded-8 mb-24" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error-text)' }}>
            {error}
          </div>
        )}

        {!isSearching && !error && totalResults === 0 && query && (
          <div className="text-center rounded-8 p-32 text-secondary bg-surface-2">
            <div className="mb-16" style={{ fontSize: '48px' }}>🔍</div>
            <h3 className="fs-20 mb-8 text-primary">No results found</h3>
            <p>We couldn't find anything matching "{query}". Try different keywords or check for typos.</p>
          </div>
        )}

        {/* Hierarchy Tree View (when enabled) */}
        {!isSearching && !error && groupedResults?.hierarchy && showHierarchy && (
          <div className="mb-32">
            <HierarchyTreeView hierarchy={groupedResults.hierarchy} />
          </div>
        )}

        {!isSearching && !error && groupedResults && !isFiltered && (
          <div className="grid gap-32">
            {(Object.entries(groupedResults) as [string, SearchResult[]][])
              .filter(([category]) => category !== 'hierarchy')
              .map(([category, results]) => {
              if (!results || results.length === 0) return null;
              return (
                <div key={category}>
                  <div className="flex-between mb-16">
                    <h2 className="fs-20 fw-600 flex-row gap-8 text-primary">
                      <span>{getCategoryIcon(category)}</span>
                      {getCategoryLabel(category)}
                      <span className="fs-14 fw-400 rounded-12 text-secondary bg-surface-2" style={{ padding: '2px 8px' }}>
                        {results.length}
                      </span>
                    </h2>
                    {results.length >= 5 && (
                      <button
                        onClick={() => handleCategoryClick(category)}
                        className="fw-500 cursor-pointer border-none"
                        style={{ color: 'var(--color-primary)', background: 'none' }}
                      >
                        View All
                      </button>
                    )}
                  </div>
                  <div className="grid gap-12">
                    {results.map((result) => (
                      <Link
                        key={result.id}
                        to={result.url}
                        style={{
                          background: 'var(--color-bg-surface)',
                          border: '1px solid var(--color-border)',
                          textDecoration: 'none',
                          transition: 'transform 0.1s, box-shadow 0.1s',
                        }}
                        className="search-result-card block p-16 rounded-8"
                      >
                        <h3 className="fs-16 fw-600 mb-4 text-primary">
                          {result.title}
                        </h3>
                        {result.description && (
                          <p className="fs-14 mb-8 text-secondary" style={{ lineHeight: '1.5' }}>
                            {result.description}
                          </p>
                        )}
                        {result.highlight && (
                          <div
                            className="fs-13"
                            style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}
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
            <div className="grid gap-12 mb-24">
              {paginatedResults.results.map((result) => (
                <Link
                  key={result.id}
                  to={result.url}
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                  }}
                  className="search-result-card block p-16 rounded-8"
                >
                  <h3 className="fs-16 fw-600 mb-4 text-primary">
                    {result.title}
                  </h3>
                  {result.description && (
                    <p className="fs-14 mb-8 text-secondary" style={{ lineHeight: '1.5' }}>
                      {result.description}
                    </p>
                  )}
                  {result.highlight && (
                    <div
                      className="fs-13"
                      style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}
                      dangerouslySetInnerHTML={{ __html: result.highlight }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex-center gap-12 mt-32">
              <button
                disabled={!paginatedResults.previous}
                onClick={() => handlePageChange(page - 1)}
                className="py-8 px-16 rounded-4"
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  cursor: paginatedResults.previous ? 'pointer' : 'not-allowed',
                  opacity: paginatedResults.previous ? 1 : 0.5,
                }}
              >
                Previous
              </button>
              <span className="flex-row text-secondary">
                Page {page}
              </span>
              <button
                disabled={!paginatedResults.next}
                onClick={() => handlePageChange(page + 1)}
                className="py-8 px-16 rounded-4"
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
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
        <div className="flex-col gap-8">
          {/* Clear Filter Option */}
          <button
            onClick={handleClearFilter}
            className="flex-row gap-12 p-16 border-none rounded-8 cursor-pointer text-left"
            style={{
              background: !isFiltered ? 'var(--color-primary-bg, rgba(59, 130, 246, 0.1))' : 'transparent',
              minHeight: '44px',
            }}
          >
            <span className="fs-20">🔍</span>
            <span style={{ fontWeight: !isFiltered ? '600' : '400', color: 'var(--color-text-primary)' }}>
              Alle categorieën
            </span>
          </button>

          {/* Category Options */}
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className="flex-row gap-12 p-16 border-none rounded-8 cursor-pointer text-left"
              style={{
                background: types.includes(category) ? 'var(--color-primary-bg, rgba(59, 130, 246, 0.1))' : 'transparent',
                minHeight: '44px',
              }}
            >
              <span className="fs-20">{getCategoryIcon(category)}</span>
              <span className="fw-500" style={{ color: types.includes(category) ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                {getCategoryLabel(category)}
              </span>
              {types.includes(category) && (
                <span className="ml-auto" style={{ color: 'var(--color-primary)' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </AppShell>
  );
}
