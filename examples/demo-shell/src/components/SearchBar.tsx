import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch, useDebounce, type GroupedSearchResults, type SearchResult } from '../hooks/useSearch';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({ placeholder = 'Search...', className = '' }: SearchBarProps) {
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

  const totalResults = results
    ? (results.users?.length || 0) + (results.organisations?.length || 0) + (results.projects?.length || 0)
    : 0;

  return (
    <div ref={searchRef} className={`search-bar ${className}`} style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '8px 12px 8px 36px',
            fontSize: '16px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'var(--color-background-secondary)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            query.trim().length >= 2 && setIsOpen(true);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
          }}
        >
          🔍
        </span>
      </form>

      {isOpen && query.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--color-background-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxHeight: '70vh',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {isSearching && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Searching...
            </div>
          )}

          {!isSearching && totalResults === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No results found for "{query}"
            </div>
          )}

          {!isSearching && results && totalResults > 0 && (
            <div>
              {(Object.keys(results) as Array<keyof GroupedSearchResults>).map((category) => {
                const categoryResults = results[category];
                if (!categoryResults || categoryResults.length === 0) return null;

                return (
                  <div key={category} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-background-secondary)',
                        fontWeight: '600',
                        fontSize: '13px',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <span>
                        {getCategoryIcon(category)} {getCategoryLabel(category)}
                      </span>
                      <button
                        onClick={() => handleViewAll(category)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: '12px',
                          cursor: 'pointer',
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
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: 'none',
                          background: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                          {result.title}
                        </div>
                        {result.highlight && (
                          <div
                            style={{
                              fontSize: '13px',
                              color: 'var(--color-text-secondary)',
                              lineHeight: '1.4',
                            }}
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
