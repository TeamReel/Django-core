import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, X } from 'lucide-react';
import { useSearch, useDebounce, type GroupedSearchResults, type SearchResult } from '../hooks/useSearch';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { sanitizeHighlight } from '../utils/sanitize';
import { routes } from '../routes';
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { history, addQuery, removeQuery, clearHistory } = useSearchHistory();

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
    addQuery(query.trim());
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
    onQueryChange?.('');
    navigate(result.url);
  };

  const handleViewAll = (category: string) => {
    addQuery(query.trim());
    setIsOpen(false);
    navigate(routes.search({ q: query, types: category }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addQuery(query.trim());
      setIsOpen(false);
      navigate(routes.search({ q: query }));
    }
  };

  const handleRecentClick = (q: string) => {
    setQuery(q);
    onQueryChange?.(q);
    setIsOpen(false);
    navigate(routes.search({ q }));
  };

  // Build a flat list of selectable items for keyboard navigation
  const flatResults: SearchResult[] = results
    ? (Object.keys(results) as Array<keyof GroupedSearchResults>)
        .filter((cat) => cat !== 'hierarchy')
        .flatMap((cat) => (results[cat] as SearchResult[] | undefined) ?? [])
    : [];

  // Show recent queries when input focused but empty
  const showRecents = isOpen && query.trim().length < 2 && history.length > 0;
  const showResults = isOpen && query.trim().length >= 2;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (showRecents) {
        // Navigate recent items
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, history.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < history.length) {
          e.preventDefault();
          handleRecentClick(history[activeIndex]);
        }
        return;
      }

      if (showResults && flatResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < flatResults.length) {
          e.preventDefault();
          handleResultClick(flatResults[activeIndex]);
        }
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    },
    [isOpen, showRecents, showResults, activeIndex, history, flatResults],
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery, isOpen]);

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      organisations: 'Federaties',
      clubs: 'Clubs',
      teams: 'Teams',
      seasons: 'Seizoenen',
      competitions: 'Competities',
      matches: 'Wedstrijden',
      users: 'Gebruikers',
      periods: 'Periodes',
      activities: 'Activiteiten',
      projects: 'Projecten',
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
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onQueryChange?.(next);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.input}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
            } else if (history.length > 0) {
              setIsOpen(true);
            }
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        <span
          className={`absolute fs-16 text-secondary ${styles.searchIcon}`}
          aria-hidden="true"
        >
          <Search size={16} />
        </span>
      </form>

      {/* Recent search queries */}
      {showRecents && (
        <div
          className={`absolute rounded-8 shadow-lg overflow-y-auto z-1000 ${styles.dropdown}`}
          role="listbox"
        >
          <div className={`flex-between py-12 px-16 fw-600 fs-13 text-primary ${styles.categoryHeader}`}>
            <span><Clock size={14} style={{ verticalAlign: '-2px', marginRight: '6px' }} />Recente zoekopdrachten</span>
            <button
              onClick={(e) => { e.preventDefault(); clearHistory(); setIsOpen(false); }}
              className={`fs-12 cursor-pointer ${styles.viewAllButton}`}
            >
              Wissen
            </button>
          </div>
          {history.map((q, i) => (
            <button
              key={q}
              onClick={() => handleRecentClick(q)}
              className={`text-left cursor-pointer transition ${styles.resultButton} ${i === activeIndex ? styles.resultActive : ''}`}
              role="option"
              aria-selected={i === activeIndex}
            >
              <div className="flex-between">
                <span className="fw-500 text-primary">{q}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); removeQuery(q); }}
                  className={styles.removeRecent}
                  aria-label={`Verwijder "${q}"`}
                >
                  <X size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && (
        <div
          className={`absolute rounded-8 shadow-lg overflow-y-auto z-1000 ${styles.dropdown}`}
          role="listbox"
        >
          {isSearching && (
            <div className="p-16 text-center text-secondary">
              Zoeken...
            </div>
          )}

          {!isSearching && totalResults === 0 && (
            <div className="p-16 text-center text-secondary">
              Geen resultaten voor "{query}"
            </div>
          )}

          {!isSearching && results && totalResults > 0 && (
            <div>
              {(() => {
                let flatIdx = 0;
                return (Object.keys(results) as Array<keyof GroupedSearchResults>)
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
                          Bekijk alles →
                        </button>
                      </div>
                      {categoryResults.map((result) => {
                        const idx = flatIdx++;
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className={`text-left cursor-pointer transition ${styles.resultButton} ${idx === activeIndex ? styles.resultActive : ''}`}
                            role="option"
                            aria-selected={idx === activeIndex}
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
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
