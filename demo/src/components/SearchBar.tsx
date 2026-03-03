import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch, useDebounce, type GroupedSearchResults, type SearchResult } from '../hooks/useSearch';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onQueryChange?: (query: string) => void;
}

export function SearchBar({ placeholder = 'Search...', className = '', onQueryChange }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<GroupedSearchResults | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { searchGlobal, isSearching } = useSearch();
  const debouncedQuery = useDebounce(query, 500);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      console.log('[SearchBar] Searching for:', debouncedQuery);
      searchGlobal(debouncedQuery).then((data) => {
        console.log('[SearchBar] Results:', data);
        setResults(data);
        setIsOpen(true);
      });
    } else {
      setResults(null);
      setIsOpen(false);
    }
  }, [debouncedQuery, searchGlobal]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    onQueryChange?.('');
    navigate(result.url);
  };

  const handleViewAll = (category: string) => {
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}&types=${category}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
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

  const totalResults = results
    ? (results.clubs?.length || 0) +
      (results.teams?.length || 0) +
      (results.seasons?.length || 0) +
      (results.competitions?.length || 0) +
      (results.periods?.length || 0) +
      (results.matches?.length || 0) +
      (results.activities?.length || 0) +
      (results.users?.length || 0) +
      (results.organisations?.length || 0) +
      (results.projects?.length || 0)
    : 0;

  return (
    <div ref={searchRef} className={`search-bar ${className} relative`} style={{ width: '100%', maxWidth: '600px' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onQueryChange?.(next);
          }}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '8px 12px 8px 36px',
            fontSize: '16px',
            border: '1px solid var(--app-border, var(--color-border))',
            borderRadius: '6px',
            backgroundColor: 'var(--app-surface, var(--color-background-secondary))',
            color: 'var(--app-text, var(--color-text-primary))',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--app-primary, var(--color-primary))';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            query.trim().length >= 2 && setIsOpen(true);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--app-border, var(--color-border))';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <span
          className="absolute fs-16 text-secondary"
          style={{
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          🔍
        </span>
      </form>

      {isOpen && query.trim().length >= 2 && (
        <div
          className="absolute rounded-8 shadow-lg overflow-y-auto z-1000"
          style={{
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--app-surface, var(--color-background-primary))',
            border: '1px solid var(--app-border, var(--color-border))',
            maxHeight: '70vh',
          }}
        >
          {isSearching && (
            <div className="p-16 text-center text-secondary">
              Searching...
            </div>
          )}

          {!isSearching && totalResults === 0 && (
            <div className="p-16 text-center text-secondary">
              No results found for "{query}"
            </div>
          )}

          {!isSearching && results && totalResults > 0 && (
            <div>
              {(Object.keys(results) as Array<keyof GroupedSearchResults>)
                .filter((category) => category !== 'hierarchy')
                .map((category) => {
                const categoryResults = results[category] as SearchResult[] | undefined;
                if (!categoryResults || categoryResults.length === 0) return null;

                return (
                  <div key={category} className="border-bottom">
                    <div
                      className="flex-between py-12 px-16 fw-600 fs-13 text-primary"
                      style={{ backgroundColor: 'var(--color-background-secondary)' }}
                    >
                      <span>
                        {getCategoryIcon(category)} {getCategoryLabel(category)}
                      </span>
                      <button
                        onClick={() => handleViewAll(category)}
                        className="fs-12 cursor-pointer"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          padding: '4px 8px',
                        }}
                      >
                        View All →
                      </button>
                    </div>
                    {categoryResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="text-left cursor-pointer transition"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="fw-500 text-primary mb-4">
                          {result.title}
                        </div>
                        {result.highlight && (
                          <div
                            className="fs-13 text-secondary"
                            style={{ lineHeight: '1.4' }}
                            dangerouslySetInnerHTML={{ __html: result.highlight }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
