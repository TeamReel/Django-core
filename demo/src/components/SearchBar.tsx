import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch, useDebounce, type GroupedSearchResults, type SearchResult } from '../hooks/useSearch';
import { sanitizeHighlight } from '../utils/sanitize';
import styles from './SearchBar.module.css';

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
      searchGlobal(debouncedQuery).then((data) => {
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
      organisations: 'landmark',
      clubs: 'landmark',
      teams: 'shirt',
      seasons: 'calendar',
      competitions: 'trophy',
      matches: 'target',
      users: 'users',
      periods: 'calendar',
      activities: 'calendar',
      projects: 'folder',
    };
    return icons[category] || 'file-text';
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
    <div ref={searchRef} className={`search-bar ${className} relative ${styles.container}`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onQueryChange?.(next);
          }}
          placeholder={placeholder}
          className={styles.input}
          onFocus={() => {
            query.trim().length >= 2 && setIsOpen(true);
          }}
        />
        <span
          className={`absolute fs-16 text-secondary ${styles.searchIcon}`}
        >
          🔍
        </span>
      </form>

      {isOpen && query.trim().length >= 2 && (
        <div
          className={`absolute rounded-8 shadow-lg overflow-y-auto z-1000 ${styles.dropdown}`}
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
                      className={`flex-between py-12 px-16 fw-600 fs-13 text-primary ${styles.categoryHeader}`}
                    >
                      <span>
                        {getCategoryIcon(category)} {getCategoryLabel(category)}
                      </span>
                      <button
                        onClick={() => handleViewAll(category)}
                        className={`fs-12 cursor-pointer ${styles.viewAllButton}`}
                      >
                        View All →
                      </button>
                    </div>
                    {categoryResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={`text-left cursor-pointer transition ${styles.resultButton}`}
                      >
                        <div className="fw-500 text-primary mb-4">
                          {result.title}
                        </div>
                        {result.highlight && (
                          <div
                            className={`fs-13 text-secondary ${styles.highlight}`}
                            dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.highlight) }}
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
