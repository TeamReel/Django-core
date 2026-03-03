import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, Trash2, X } from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { useNavRecents, useNavFavorites } from '../hooks/useNavItems';
import { clearRecents, removeRecent, toggleFavorite, type NavStoredItem } from '../utils/navStorage';

export default function RecentsPage() {
  const recents = useNavRecents();
  const favorites = useNavFavorites();

  const favoritePaths = useMemo(() => new Set(favorites.map(f => f.path)), [favorites]);

  const onToggleFavorite = (item: NavStoredItem) => {
    toggleFavorite({ kind: item.kind, label: item.label, path: item.path });
  };

  return (
    <div className="bg-primary" style={{ minHeight: '100%' }}>
      <div className="flex-between gap-12 mb-16">
        <div>
          <h1 className="m-0 text-primary">Recents</h1>
          <div className="fs-13 text-muted mt-4">
            Recently visited items across the app.
          </div>
        </div>

        <div className="flex-row gap-8">
          <Link
            to="/favorites"
            className="inline-flex gap-8 rounded-8 border bg-surface text-primary fs-13 fw-600"
            style={{
              padding: '8px 10px',
              textDecoration: 'none',
            }}
          >
            <AppIcon icon={Star} size={16} /> Favorites
          </Link>

          <button
            type="button"
            onClick={() => clearRecents()}
            className="inline-flex gap-8 rounded-8 border bg-surface text-primary cursor-pointer fs-13 fw-600"
            style={{
              padding: '8px 10px',
            }}
            title="Clear recents"
          >
            <AppIcon icon={Trash2} size={16} /> Clear
          </button>
        </div>
      </div>

      <div
        className="bg-surface border rounded-12 overflow-hidden"
      >
        {recents.length === 0 ? (
          <div className="p-16 text-muted">
            No recent items yet.
          </div>
        ) : (
          recents.map((item) => {
            const isFav = favoritePaths.has(item.path);
            return (
              <div
                key={item.path}
                className="flex-between gap-12 border-top"
                style={{
                  padding: '12px 14px',
                }}
              >
                <Link
                  to={item.path}
                  className="flex-row gap-10 text-primary min-w-0"
                  style={{
                    textDecoration: 'none',
                  }}
                >
                  <AppIcon icon={Clock} size={16} />
                  <span className="fw-600 fs-14 truncate">
                    {item.label}
                  </span>
                  <span className="fs-12 text-muted">{item.kind}</span>
                </Link>

                <div className="flex-row gap-6">
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(item)}
                    className="border bg-surface-2 rounded-8 cursor-pointer inline-flex gap-6 fs-12 fw-600"
                    style={{
                      padding: '6px 8px',
                      color: isFav ? 'var(--color-amber-400)' : 'var(--app-text)',
                    }}
                    title={isFav ? 'Unfavorite' : 'Add to favorites'}
                  >
                    <AppIcon icon={Star} size={14} />
                    {isFav ? 'Saved' : 'Save'}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeRecent(item.path)}
                    className="border bg-surface-2 rounded-8 cursor-pointer inline-flex gap-6 fs-12 fw-600 text-primary"
                    style={{
                      padding: '6px 8px',
                    }}
                    title="Remove"
                  >
                    <AppIcon icon={X} size={14} />
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
