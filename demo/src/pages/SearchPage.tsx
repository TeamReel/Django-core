import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSearch, type GroupedSearchResults, type PaginatedSearchResults, type SearchResult } from '../hooks/useSearch';
import AppShell from '../components/AppShell';
import HierarchyTreeView from '../components/HierarchyTreeView';
import { BottomSheet, Button } from '@django-core/design-system';
import SmartEmptyState from '../components/SmartEmptyState';
import styles from './SearchPage.module.css';

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
            <h1 className={`fw-700 text-primary ${styles.pageTitle}`}>
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
                  <span className={`flex-center fs-11 rounded-full text-white ${styles.filterBadge}`}>
                    {types.length}
                  </span>
                )}
              </Button>
              {/* Hierarchy Toggle */}
              {query && !isFiltered && (
                <button
                onClick={handleHierarchyToggle}
                className={`flex-row gap-8 py-8 px-16 fs-14 fw-500 rounded-8 cursor-pointer transition ${showHierarchy ? styles.hierarchyToggleActive : styles.hierarchyToggle}`}
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
                      className={`fs-14 rounded-4 cursor-pointer py-4 px-12 bg-transparent border text-secondary ${styles.clearFilterInline}`}
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
          <div className="p-16 rounded-8 mb-24 callout-error">
            {error}
          </div>
        )}

        {!isSearching && !error && totalResults === 0 && query && (
          <SmartEmptyState
            type="search"
            title="Geen resultaten"
            description={`We konden niets vinden voor "${query}". Probeer andere zoektermen.`}
            hideActions
          />
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
                      <span className={`fs-14 fw-400 rounded-12 text-secondary bg-surface-2 ${styles.categoryCount}`}>
                        {results.length}
                      </span>
                    </h2>
                    {results.length >= 5 && (
                      <button
                        onClick={() => handleCategoryClick(category)}
                        className={`fw-500 cursor-pointer border-none bg-transparent ${styles.viewAllButton}`}
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
                        className="search-result-card block p-16 rounded-8 text-decoration-none bg-surface border transition"
                      >
                        <h3 className="fs-16 fw-600 mb-4 text-primary">
                          {result.title}
                        </h3>
                        {result.description && (
                          <p className={`fs-14 mb-8 text-secondary ${styles.resultDescription}`}>
                            {result.description}
                          </p>
                        )}
                        {result.highlight && (
                          <div
                            className={`fs-13 ${styles.resultHighlight}`}
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
                  className="search-result-card block p-16 rounded-8 text-decoration-none bg-surface border"
                >
                  <h3 className="fs-16 fw-600 mb-4 text-primary">
                    {result.title}
                  </h3>
                  {result.description && (
                    <p className={`fs-14 mb-8 text-secondary ${styles.resultDescription}`}>
                      {result.description}
                    </p>
                  )}
                  {result.highlight && (
                    <div
                      className={`fs-13 ${styles.resultHighlight}`}
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
                className={`py-8 px-16 rounded-4 bg-surface border ${paginatedResults.previous ? styles.paginationButton : styles.paginationButtonDisabled}`}
              >
                Previous
              </button>
              <span className="flex-row text-secondary">
                Page {page}
              </span>
              <button
                disabled={!paginatedResults.next}
                onClick={() => handlePageChange(page + 1)}
                className={`py-8 px-16 rounded-4 bg-surface border ${paginatedResults.next ? styles.paginationButton : styles.paginationButtonDisabled}`}
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
            className={`flex-row gap-12 p-16 border-none rounded-8 cursor-pointer text-left ${!isFiltered ? styles.filterSheetOptionActive : styles.filterSheetOption}`}
          >
            <span className="fs-20">🔍</span>
            <span className={!isFiltered ? styles.filterSheetLabelActive : styles.filterSheetLabel}>
              Alle categorieën
            </span>
          </button>

          {/* Category Options */}
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`flex-row gap-12 p-16 border-none rounded-8 cursor-pointer text-left ${types.includes(category) ? styles.filterSheetOptionActive : styles.filterSheetOption}`}
            >
              <span className="fs-20">{getCategoryIcon(category)}</span>
              <span className={`fw-500 ${types.includes(category) ? styles.categoryLabelActive : styles.categoryLabel}`}>
                {getCategoryLabel(category)}
              </span>
              {types.includes(category) && (
                <span className={`ml-auto ${styles.checkMark}`}>OK</span>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </AppShell>
  );
}
