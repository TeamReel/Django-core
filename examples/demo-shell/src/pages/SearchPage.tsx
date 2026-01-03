import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSearch, type GroupedSearchResults, type PaginatedSearchResults, type SearchResult } from '../hooks/useSearch';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [groupedResults, setGroupedResults] = useState<GroupedSearchResults | null>(null);
  const [paginatedResults, setPaginatedResults] = useState<PaginatedSearchResults | null>(null);
  const { searchGlobal, searchFiltered, isSearching, error } = useSearch();

  const isFiltered = types.length > 0;

  // Perform search when query/types/page changes
  useEffect(() => {
    if (query.trim()) {
      if (isFiltered) {
        searchFiltered(query, types, page).then(setPaginatedResults);
      } else {
        searchGlobal(query).then(setGroupedResults);
      }
    }
  }, [query, types, page, isFiltered, searchGlobal, searchFiltered]);

  const handleCategoryClick = (category: string) => {
    setSearchParams({ q: query, types: category });
  };

  const handleClearFilter = () => {
    setSearchParams({ q: query });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: query, types: types.join(','), page: newPage.toString() });
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      users: 'Users',
      organisations: 'Organisations',
      projects: 'Projects',
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      users: '👥',
      organisations: '🏢',
      projects: '📁',
    };
    return icons[category] || '📄';
  };

  const totalResults = groupedResults
    ? (groupedResults.users?.length || 0) +
      (groupedResults.organisations?.length || 0) +
      (groupedResults.projects?.length || 0)
    : paginatedResults?.count || 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
          Search Results
        </h1>
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
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <div>Searching...</div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error)',
            borderRadius: '8px',
            color: 'var(--color-error)',
            marginBottom: '24px',
          }}
        >
          ❌ {error}
        </div>
      )}

      {!isSearching && !error && query && totalResults === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <div>No results found for "{query}"</div>
          <div style={{ marginTop: '8px', fontSize: '14px' }}>Try adjusting your search terms</div>
        </div>
      )}

      {!isSearching && !error && !isFiltered && groupedResults && (
        <div>
          {(Object.keys(groupedResults) as Array<keyof GroupedSearchResults>).map((category) => {
            const categoryResults = groupedResults[category];
            if (!categoryResults || categoryResults.length === 0) return null;

            return (
              <div
                key={category}
                style={{
                  marginBottom: '32px',
                  backgroundColor: 'var(--color-background-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: 'var(--color-background-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--color-text-primary)' }}>
                    {getCategoryIcon(category)} {getCategoryLabel(category)}
                  </h2>
                  <button
                    onClick={() => handleCategoryClick(category)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      background: 'none',
                      border: '1px solid var(--color-primary)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: 'var(--color-primary)',
                      fontWeight: '500',
                    }}
                  >
                    View All →
                  </button>
                </div>
                <div>
                  {categoryResults.map((result) => (
                    <SearchResultCard key={result.id} result={result} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isSearching && !error && isFiltered && paginatedResults && (
        <div>
          <div
            style={{
              marginBottom: '16px',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}
          >
            {paginatedResults.count} results
          </div>
          <div
            style={{
              backgroundColor: 'var(--color-background-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {paginatedResults.results.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>

          {(paginatedResults.previous || paginatedResults.next) && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={!paginatedResults.previous}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  cursor: paginatedResults.previous ? 'pointer' : 'not-allowed',
                  backgroundColor: paginatedResults.previous
                    ? 'var(--color-background-primary)'
                    : 'var(--color-background-secondary)',
                  color: paginatedResults.previous ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                }}
              >
                ← Previous
              </button>
              <span style={{ padding: '8px 16px', color: 'var(--color-text-primary)' }}>Page {page}</span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={!paginatedResults.next}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  cursor: paginatedResults.next ? 'pointer' : 'not-allowed',
                  backgroundColor: paginatedResults.next
                    ? 'var(--color-background-primary)'
                    : 'var(--color-background-secondary)',
                  color: paginatedResults.next ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <Link
      to={result.url}
      style={{
        display: 'block',
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
        textDecoration: 'none',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {result.image_url && (
          <img
            src={result.image_url}
            alt={result.title}
            style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px', fontSize: '16px' }}>
            {result.title}
          </div>
          {result.description && (
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              {result.description}
            </div>
          )}
          {result.highlight && (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.5',
              }}
              dangerouslySetInnerHTML={{ __html: result.highlight }}
            />
          )}
        </div>
      </div>
    </Link>
  );
}

export default SearchPage;
