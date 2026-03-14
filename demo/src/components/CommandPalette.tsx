import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { routes } from '../routes';
import { Command, Star, Clock, Plus, ArrowRight } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { useNavFavorites, useNavRecents } from '../hooks/useNavItems';
import { isFavorite, toggleFavorite, type NavStoredItem } from '../utils/navStorage';
import styles from './CommandPalette.module.css';

type CommandItem = {
  id: string;
  label: string;
  path: string;
  kind: NavStoredItem['kind'];
};

export default function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const recents = useNavRecents();
  const favorites = useNavFavorites();

  const baseItems: CommandItem[] = useMemo(
    () => [
      { id: 'dash', label: 'Dashboard', path: routes.dashboard(), kind: 'page' },
      { id: 'dir', label: 'Directory', path: '/directory', kind: 'page' },
      { id: 'profile', label: 'My Profile', path: '/preferences?tab=profile', kind: 'page' },
      { id: 'prefs', label: 'Preferences', path: '/preferences', kind: 'page' },
      { id: 'wallet', label: 'My Wallet', path: '/credits?wallet=personal', kind: 'page' },
      { id: 'recents', label: 'Recents', path: '/recents', kind: 'page' },
      { id: 'favorites', label: 'Favorites', path: '/favorites', kind: 'page' },
    ],
    []
  );

  const createItems: CommandItem[] = useMemo(
    () => [
      { id: 'create-federation', label: 'Create Federation', path: '/organisations/create', kind: 'page' },
      { id: 'create-club', label: 'Create Club', path: '/directory?tab=clubs', kind: 'page' },
      { id: 'create-team', label: 'Create Team', path: '/directory?tab=teams', kind: 'page' },
      { id: 'create-season', label: 'Create Season', path: '/directory?tab=seasons', kind: 'page' },
      { id: 'create-competition', label: 'Create Competition', path: '/directory?tab=competitions', kind: 'page' },
      { id: 'create-match', label: 'Create Match', path: '/directory?tab=matches&create=match', kind: 'page' },
      { id: 'create-content', label: 'Create Content', path: '/content', kind: 'page' },
    ],
    []
  );

  const combined: CommandItem[] = useMemo(() => {
    const rec: CommandItem[] = recents.slice(0, 8).map((r) => ({
      id: `recent:${r.path}`,
      label: r.label,
      path: r.path,
      kind: r.kind,
    }));
    const fav: CommandItem[] = favorites.slice(0, 8).map((f) => ({
      id: `fav:${f.path}`,
      label: f.label,
      path: f.path,
      kind: f.kind,
    }));

    return [
      ...baseItems,
      ...createItems,
      ...fav,
      ...rec,
    ];
  }, [baseItems, createItems, favorites, recents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return combined;
    return combined.filter((x) =>
      x.label.toLowerCase().includes(q) ||
      x.path.toLowerCase().includes(q)
    );
  }, [combined, query]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) {
          onClose();
          navigate(item.path);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, filtered, isOpen, navigate, onClose]);

  // Close when route changes
  useEffect(() => {
    if (!isOpen) return;
    onClose();
  }, [location.pathname, location.search]);

  if (!isOpen) return null;

  const active = filtered[activeIndex];

  const iconFor = (item: CommandItem) => {
    if (item.id.startsWith('create-')) return Plus;
    if (item.id.startsWith('fav:')) return Star;
    if (item.id.startsWith('recent:')) return Clock;
    return Command;
  };

  const onToggleFavoriteCurrent = () => {
    const path = String(active?.path || '').trim();
    if (!path) return;
    toggleFavorite({ kind: active?.kind || 'page', label: active?.label || path, path });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 ${styles.overlay}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`absolute inset-0 ${styles.backdrop}`}
      />

      <div
        className={`relative overflow-hidden ${styles.panel}`}
      >
        <div
          className={`p-12 flex-row border-bottom ${styles.searchRow}`}
        >
          <AppIcon icon={Command} size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search pages, recents, favorites…"
            className={`flex-1 border-none bg-transparent fs-14 ${styles.searchInput}`}
          />
          {active?.path && (
            <button
              type="button"
              onClick={onToggleFavoriteCurrent}
              title={isFavorite(active.path) ? 'Remove from favorites' : 'Add to favorites'}
              className={styles.favButton}
              data-saved={isFavorite(active.path)}
            >
              <AppIcon icon={Star} size={14} />
              {isFavorite(active.path) ? 'Saved' : 'Save'}
            </button>
          )}
        </div>

        <div className={`overflow-y-auto ${styles.resultsList}`}>
          {filtered.length === 0 ? (
            <div className={styles.noResults}>No results.</div>
          ) : (
            filtered.map((item, idx) => {
              const selected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onClose();
                    navigate(item.path);
                  }}
                  className={`w-full text-left cursor-pointer flex-between ${styles.resultItem}`}
                  data-selected={selected}
                >
                  <span className={styles.resultLeft}>
                    <AppIcon icon={iconFor(item)} size={16} />
                    <span className={`fs-14 truncate ${styles.resultLabel}`}>
                      {item.label}
                    </span>
                    <span className={`fs-12 ${styles.resultKind}`}>{item.kind}</span>
                  </span>
                  <span className={styles.resultRight}>
                    <span className="fs-12 whitespace-nowrap">{item.path}</span>
                    <AppIcon icon={ArrowRight} size={14} />
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div
          className={`flex-between border-top fs-12 ${styles.footer}`}
        >
          <span>Enter to open • Esc to close</span>
          <span>↑/↓ to navigate</span>
        </div>
      </div>
    </div>
  );
}
